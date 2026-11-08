//! Just enough of the PE format to identify a version and find its data.
//!
//! The same code reads an executable file during setup and the loaded image
//! in the game. The only difference is where an RVA is: a file stores each
//! section at its own file offset, while a loaded image has every RVA at that
//! offset from its base. Input is untrusted, so every read is bounds-checked,
//! and a malformed file gives an error, never a panic.

use crate::library::Identity;

/// How the bytes are laid out.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Layout {
    /// An executable file as stored on disk.
    File,
    /// A loaded image, starting at its base address.
    Image,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Section {
    pub name: String,
    pub rva: u32,
    pub virtual_size: u32,
    pub file_offset: u32,
    pub file_size: u32,
}

/// The parts of the headers AxeGraft Patcher uses.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Headers {
    pub timestamp: u32,
    pub image_base: u32,
    pub size_of_image: u32,
    pub resources: Option<(u32, u32)>,
    /// The base relocation table, if the file has one.
    pub relocations: Option<(u32, u32)>,
    pub size_of_headers: u32,
    pub sections: Vec<Section>,
}

impl Headers {
    /// The file offset of an RVA, if a section stores it.
    pub fn file_offset(&self, rva: u32) -> Option<u32> {
        if rva < self.sections.first().map_or(0x1000, |s| s.rva).min(0x1000) {
            return Some(rva);
        }
        // Bytes past a section's virtual size are file padding, which isn't loaded.
        self.sections.iter().find_map(|s| {
            let size = if s.virtual_size == 0 { s.file_size } else { s.virtual_size.min(s.file_size) };
            (rva >= s.rva && rva - s.rva < size).then(|| s.file_offset + (rva - s.rva))
        })
    }
}

fn u16_at(b: &[u8], at: usize) -> Option<u16> {
    Some(u16::from_le_bytes(b.get(at..at.checked_add(2)?)?.try_into().ok()?))
}

fn u32_at(b: &[u8], at: usize) -> Option<u32> {
    Some(u32::from_le_bytes(b.get(at..at.checked_add(4)?)?.try_into().ok()?))
}

/// Reads the headers of a 32-bit PE file or image.
pub fn headers(b: &[u8]) -> Result<Headers, String> {
    if b.get(0..2) != Some(b"MZ") {
        return Err("it isn't an executable: it has no MZ header".into());
    }
    let pe = u32_at(b, 0x3C).ok_or("its DOS header is cut short")? as usize;
    if b.get(pe..pe.saturating_add(4)) != Some(b"PE\0\0") {
        return Err("it has no PE header".into());
    }
    let coff = pe + 4;
    let sections = u16_at(b, coff + 2).ok_or("its PE header is cut short")? as usize;
    let timestamp = u32_at(b, coff + 4).ok_or("its PE header is cut short")?;
    let opt_size = u16_at(b, coff + 16).ok_or("its PE header is cut short")? as usize;
    let opt = coff + 20;
    if u16_at(b, opt) != Some(0x10B) {
        return Err("it isn't a 32-bit executable".into());
    }
    let image_base = u32_at(b, opt + 28).ok_or("its optional header is cut short")?;
    let size_of_image = u32_at(b, opt + 56).ok_or("its optional header is cut short")?;
    let dirs = u32_at(b, opt + 92).ok_or("its optional header is cut short")?;
    let resources = if dirs > 2 && opt_size >= 96 + 3 * 8 {
        let rva = u32_at(b, opt + 96 + 16).ok_or("its data directories are cut short")?;
        let size = u32_at(b, opt + 96 + 20).ok_or("its data directories are cut short")?;
        (rva != 0 && size != 0).then_some((rva, size))
    } else {
        None
    };
    let dir = |i: usize| -> Option<(u32, u32)> {
        if dirs as usize > i && opt_size >= 96 + (i + 1) * 8 {
            let rva = u32_at(b, opt + 96 + i * 8)?;
            let size = u32_at(b, opt + 96 + i * 8 + 4)?;
            (rva != 0 && size != 0).then_some((rva, size))
        } else {
            None
        }
    };
    let stripped = u16_at(b, coff + 18).is_some_and(|c| c & 1 != 0);
    let relocations = if stripped { None } else { dir(5) };
    let size_of_headers = u32_at(b, opt + 60).ok_or("its optional header is cut short")?;
    let mut list = Vec::new();
    let table = opt + opt_size;
    for i in 0..sections.min(96) {
        let s = table + i * 40;
        let raw = b.get(s..s + 8).ok_or("its section table is cut short")?;
        let name = String::from_utf8_lossy(raw).trim_end_matches('\0').to_string();
        list.push(Section {
            name,
            virtual_size: u32_at(b, s + 8).ok_or("its section table is cut short")?,
            rva: u32_at(b, s + 12).ok_or("its section table is cut short")?,
            file_size: u32_at(b, s + 16).ok_or("its section table is cut short")?,
            file_offset: u32_at(b, s + 20).ok_or("its section table is cut short")?,
        });
    }
    Ok(Headers { timestamp, image_base, size_of_image, resources, relocations, size_of_headers, sections: list })
}

/// The bytes at an RVA.
pub fn at_rva<'a>(b: &'a [u8], h: &Headers, layout: Layout, rva: u32, len: u32) -> Option<&'a [u8]> {
    let start = match layout {
        Layout::Image => rva,
        Layout::File => h.file_offset(rva)?,
    } as usize;
    b.get(start..start.checked_add(len as usize)?)
}

/// The fixed product version in the version resource.
fn product_version(b: &[u8], h: &Headers, layout: Layout) -> Result<[u16; 4], String> {
    let (root, size) = h.resources.ok_or("it has no resources, so no version resource")?;
    let res = at_rva(b, h, layout, root, size).ok_or("its resources are outside the file")?;
    // Three levels: type (16 is RT_VERSION), name, language. Take the first
    // name and language.
    let entry = |dir: usize, want: Option<u32>| -> Option<u32> {
        let named = u16_at(res, dir + 12)? as usize;
        let ids = u16_at(res, dir + 14)? as usize;
        (0..(named + ids).min(4096)).find_map(|i| {
            let e = dir + 16 + i * 8;
            let id = u32_at(res, e)?;
            let to = u32_at(res, e + 4)?;
            match want {
                Some(w) if id != w => None,
                _ => Some(to),
            }
        })
    };
    let sub = |to: u32| -> Option<usize> { (to & 0x8000_0000 != 0).then_some((to & 0x7FFF_FFFF) as usize) };
    let types = entry(0, Some(16)).and_then(sub).ok_or("it has no version resource")?;
    let names = entry(types, None).and_then(sub).ok_or("its version resource is malformed")?;
    let data = entry(names, None).filter(|to| to & 0x8000_0000 == 0).ok_or("its version resource is malformed")? as usize;
    let rva = u32_at(res, data).ok_or("its version resource is malformed")?;
    let len = u32_at(res, data + 4).ok_or("its version resource is malformed")?;
    let info = at_rva(b, h, layout, rva, len).ok_or("its version resource is outside the file")?;
    let sig = 0xFEEF04BDu32.to_le_bytes();
    let at = info.windows(4).position(|w| w == sig).ok_or("its version resource has no fixed file information")?;
    let ms = u32_at(info, at + 16).ok_or("its fixed file information is cut short")?;
    let ls = u32_at(info, at + 20).ok_or("its fixed file information is cut short")?;
    Ok([(ms >> 16) as u16, ms as u16, (ls >> 16) as u16, ls as u16])
}

/// How a version identifies itself: its PE timestamp and fixed product version.
pub fn identity(b: &[u8], layout: Layout) -> Result<Identity, String> {
    let h = headers(b)?;
    Ok(Identity { timestamp: h.timestamp, product_version: product_version(b, &h, layout)? })
}

/// Loads an executable file as Windows would at `base`: each section at its
/// RVA, and, away from the preferred base, every relocation applied. An
/// executable without relocations can only be loaded at its preferred base.
pub fn load(file: &[u8], base: u32) -> Result<Vec<u8>, String> {
    let h = headers(file)?;
    if h.size_of_image > 0x1000_0000 {
        return Err("its image is too large".into());
    }
    let mut img = vec![0u8; h.size_of_image as usize];
    let n = (h.size_of_headers as usize).min(file.len()).min(img.len());
    img[..n].copy_from_slice(&file[..n]);
    for s in &h.sections {
        let len = if s.virtual_size == 0 { s.file_size } else { s.virtual_size.min(s.file_size) } as usize;
        let src = file.get(s.file_offset as usize..s.file_offset as usize + len).ok_or_else(|| format!("section {} is outside the file", s.name))?;
        let dst = img.get_mut(s.rva as usize..s.rva as usize + len).ok_or_else(|| format!("section {} is outside the image", s.name))?;
        dst.copy_from_slice(src);
    }
    if base == h.image_base {
        return Ok(img);
    }
    let (rva, size) = h.relocations.ok_or("it has no relocations, so it can only be loaded at its preferred base")?;
    let delta = base.wrapping_sub(h.image_base);
    let table = img.get(rva as usize..(rva + size) as usize).ok_or("its relocations are outside the image")?.to_vec();
    let mut at = 0usize;
    while at + 8 <= table.len() {
        let page = u32_at(&table, at).unwrap();
        let block = u32_at(&table, at + 4).unwrap() as usize;
        if block < 8 || at + block > table.len() {
            return Err("its relocation table is malformed".into());
        }
        for k in (at + 8..at + block).step_by(2) {
            let e = u16_at(&table, k).unwrap();
            match e >> 12 {
                0 => {}
                3 => {
                    let p = (page + (e & 0xFFF) as u32) as usize;
                    let v = u32_at(&img, p).ok_or("a relocation is outside the image")?;
                    img[p..p + 4].copy_from_slice(&v.wrapping_add(delta).to_le_bytes());
                }
                t => return Err(format!("it has a relocation of type {t}, which 32-bit executables don't use")),
            }
        }
        at += block;
    }
    Ok(img)
}
