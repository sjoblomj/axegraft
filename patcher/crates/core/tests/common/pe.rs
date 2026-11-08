//! Builds small, valid 32-bit PE executables for tests, in file or image layout.

/// A synthetic executable: sections at RVAs, and a version resource.
#[derive(Clone)]
pub struct Pe {
    pub timestamp: u32,
    pub product_version: [u16; 4],
    pub image_base: u32,
    /// Name, RVA (a multiple of 0x1000) and contents.
    pub sections: Vec<(String, u32, Vec<u8>)>,
    pub version_resource: bool,
}

const FILE_ALIGN: u32 = 0x200;

fn align(v: u32, a: u32) -> u32 {
    v.div_ceil(a) * a
}

fn put16(b: &mut Vec<u8>, at: usize, v: u16) {
    b[at..at + 2].copy_from_slice(&v.to_le_bytes());
}

fn put32(b: &mut Vec<u8>, at: usize, v: u32) {
    b[at..at + 4].copy_from_slice(&v.to_le_bytes());
}

impl Pe {
    pub fn new(timestamp: u32, product_version: [u16; 4]) -> Pe {
        Pe { timestamp, product_version, image_base: 0x400000, sections: Vec::new(), version_resource: true }
    }

    pub fn section(mut self, name: &str, rva: u32, data: Vec<u8>) -> Pe {
        self.sections.push((name.into(), rva, data));
        self
    }

    /// The version resource section's contents, placed at `rva`.
    fn resource(&self, rva: u32) -> Vec<u8> {
        let mut r = vec![0u8; 0x100];
        // Root: one ID entry, type 16 (RT_VERSION), to the type directory at 0x18.
        put16(&mut r, 14, 1);
        put32(&mut r, 16, 16);
        put32(&mut r, 20, 0x8000_0000 | 0x18);
        // Type directory: name 1, to the name directory at 0x30.
        put16(&mut r, 0x18 + 14, 1);
        put32(&mut r, 0x18 + 16, 1);
        put32(&mut r, 0x18 + 20, 0x8000_0000 | 0x30);
        // Name directory: language 0x409, to the data entry at 0x48.
        put16(&mut r, 0x30 + 14, 1);
        put32(&mut r, 0x30 + 16, 0x409);
        put32(&mut r, 0x30 + 20, 0x48);
        // Data entry: the VS_VERSIONINFO at 0x58.
        let info_at = 0x58usize;
        let mut info = Vec::new();
        info.extend_from_slice(&[0, 0, 52, 0, 0, 0]);
        for c in "VS_VERSION_INFO\0".encode_utf16() {
            info.extend_from_slice(&c.to_le_bytes());
        }
        while info.len() % 4 != 0 {
            info.push(0);
        }
        let [a, b, c, d] = self.product_version.map(|x| x as u32);
        for v in [0xFEEF04BDu32, 0x10000, (a << 16) | b, (c << 16) | d, (a << 16) | b, (c << 16) | d, 0x3F, 0, 4, 1, 0, 0, 0] {
            info.extend_from_slice(&v.to_le_bytes());
        }
        let len = info.len() as u16;
        info[0..2].copy_from_slice(&len.to_le_bytes());
        put32(&mut r, 0x48, rva + info_at as u32);
        put32(&mut r, 0x4C, info.len() as u32);
        r.truncate(info_at);
        r.extend_from_slice(&info);
        r
    }

    fn all_sections(&self) -> Vec<(String, u32, Vec<u8>)> {
        let mut s = self.sections.clone();
        if self.version_resource {
            let next = s.iter().map(|(_, rva, d)| align(rva + d.len().max(1) as u32, 0x1000)).max().unwrap_or(0x1000);
            s.push((".rsrc".into(), next, self.resource(next)));
        }
        s
    }

    fn headers(&self, sections: &[(String, u32, Vec<u8>)], offsets: &[u32]) -> Vec<u8> {
        let mut h = vec![0u8; 0x400];
        h[0..2].copy_from_slice(b"MZ");
        put32(&mut h, 0x3C, 0x40);
        h[0x40..0x44].copy_from_slice(b"PE\0\0");
        let coff = 0x44;
        put16(&mut h, coff, 0x14C);
        put16(&mut h, coff + 2, sections.len() as u16);
        put32(&mut h, coff + 4, self.timestamp);
        put16(&mut h, coff + 16, 224);
        put16(&mut h, coff + 18, 0x0102);
        let opt = coff + 20;
        put16(&mut h, opt, 0x10B);
        put32(&mut h, opt + 28, self.image_base);
        put32(&mut h, opt + 32, 0x1000);
        put32(&mut h, opt + 36, FILE_ALIGN);
        let size = sections.iter().map(|(_, rva, d)| align(rva + d.len().max(1) as u32, 0x1000)).max().unwrap_or(0x1000);
        put32(&mut h, opt + 56, size);
        put32(&mut h, opt + 60, 0x400);
        put32(&mut h, opt + 92, 16);
        if self.version_resource {
            let (_, rva, d) = sections.last().unwrap();
            put32(&mut h, opt + 96 + 16, *rva);
            put32(&mut h, opt + 96 + 20, d.len() as u32);
        }
        let table = opt + 224;
        for (i, (name, rva, d)) in sections.iter().enumerate() {
            let s = table + i * 40;
            let mut n = name.as_bytes().to_vec();
            n.resize(8, 0);
            h[s..s + 8].copy_from_slice(&n);
            put32(&mut h, s + 8, d.len() as u32);
            put32(&mut h, s + 12, *rva);
            put32(&mut h, s + 16, align(d.len() as u32, FILE_ALIGN));
            put32(&mut h, s + 20, offsets[i]);
        }
        h
    }

    /// The executable as stored on disk: sections packed at file offsets
    /// that differ from their RVAs.
    pub fn file(&self) -> Vec<u8> {
        let sections = self.all_sections();
        let mut offsets = Vec::new();
        let mut at = 0x400;
        for (_, _, d) in &sections {
            offsets.push(at);
            at += align(d.len() as u32, FILE_ALIGN);
        }
        let mut f = self.headers(&sections, &offsets);
        f.resize(at as usize, 0);
        for ((_, _, d), o) in sections.iter().zip(&offsets) {
            f[*o as usize..*o as usize + d.len()].copy_from_slice(d);
        }
        f
    }

    /// The executable as loaded: every RVA at that offset.
    pub fn image(&self) -> Vec<u8> {
        let sections = self.all_sections();
        let offsets: Vec<u32> = {
            let mut at = 0x400;
            sections.iter().map(|(_, _, d)| {
                let o = at;
                at += align(d.len() as u32, FILE_ALIGN);
                o
            }).collect()
        };
        let mut img = self.headers(&sections, &offsets);
        let size = sections.iter().map(|(_, rva, d)| align(rva + d.len().max(1) as u32, 0x1000)).max().unwrap_or(0x1000);
        img.resize(size as usize, 0);
        for (_, rva, d) in &sections {
            img[*rva as usize..*rva as usize + d.len()].copy_from_slice(d);
        }
        img
    }
}
