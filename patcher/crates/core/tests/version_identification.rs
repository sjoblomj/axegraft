//! Identifying a version from its PE header and version resource, in a file
//! and in a loaded image.

mod common;

use axegraft_patcher_core::library::Identity;
use axegraft_patcher_core::pe::{headers, identity, Layout};
use common::pe::Pe;
use common::toy_library;
use proptest::prelude::*;

fn sample() -> Pe {
    Pe::new(0x49658A5A, [1, 16, 1, 1]).section(".text", 0x1000, vec![0xCC; 0x300]).section(".data", 0x4000, vec![7; 0x50])
}

#[test]
fn file_and_image_identify_the_same() {
    let pe = sample();
    let want = Identity { timestamp: 0x49658A5A, product_version: [1, 16, 1, 1] };
    assert_eq!(identity(&pe.file(), Layout::File), Ok(want));
    assert_eq!(identity(&pe.image(), Layout::Image), Ok(want));
}

#[test]
fn file_offsets_differ_from_rvas() {
    let file = sample().file();
    let h = headers(&file).unwrap();
    assert_eq!(h.image_base, 0x400000);
    let off = h.file_offset(0x4000).unwrap();
    assert_ne!(off, 0x4000);
    assert_eq!(file[off as usize], 7);
    assert_eq!(h.file_offset(0x4000 + 0x60), None, "beyond the section's data");
}

#[test]
fn versions_sharing_a_pe_timestamp() {
    let a = Pe::new(0x36E44DED, [1, 0, 5, 1]).file();
    let b = Pe::new(0x36E44DED, [1, 0, 6, 1]).file();
    let (ia, ib) = (identity(&a, Layout::File).unwrap(), identity(&b, Layout::File).unwrap());
    assert_eq!(ia.timestamp, ib.timestamp);
    assert_ne!(ia, ib);
}

#[test]
fn versions_sharing_a_product_version_string() {
    // 1.08 and 1.08b both say "Version 1.08"; only the fixed version differs,
    // and that is what's read.
    let a = Pe::new(0x3B032F2A, [1, 0, 8, 1]).file();
    let b = Pe::new(0x3B05D3E3, [1, 0, 8, 11]).file();
    assert_ne!(identity(&a, Layout::File).unwrap(), identity(&b, Layout::File).unwrap());
}

#[test]
fn identified_against_the_library() {
    let lib = toy_library();
    let img = Pe::new(0x49658A5A, [1, 16, 1, 1]).image();
    let (_, v) = lib.identify(&identity(&img, Layout::Image).unwrap()).unwrap();
    assert_eq!(v.id, "1.16.1");
    let other = Pe::new(0x49658A5A, [1, 16, 0, 1]).image();
    assert!(lib.identify(&identity(&other, Layout::Image).unwrap()).is_none());
}

#[test]
fn not_executables() {
    assert!(identity(b"", Layout::File).is_err());
    assert!(identity(b"MZ", Layout::File).is_err());
    assert!(identity(&[0u8; 4096], Layout::File).is_err());
    let mut no_res = sample();
    no_res.version_resource = false;
    let e = identity(&no_res.file(), Layout::File).unwrap_err();
    assert!(e.contains("no resources"), "{e}");
    let mut sixty_four = sample().file();
    sixty_four[0x44 + 20] = 0x0B;
    sixty_four[0x44 + 21] = 0x02;
    assert!(identity(&sixty_four, Layout::File).unwrap_err().contains("32-bit"));
}

proptest! {
    #[test]
    fn arbitrary_bytes_never_panic(b in prop::collection::vec(any::<u8>(), 0..2048)) {
        let _ = identity(&b, Layout::File);
        let _ = identity(&b, Layout::Image);
    }

    #[test]
    fn damaged_executables_never_panic(at in 0usize..0x1800, v in any::<u8>(), cut in 0usize..0x2000) {
        for mut b in [sample().file(), sample().image()] {
            if at < b.len() { b[at] = v; }
            b.truncate(cut.max(1).min(b.len()));
            let _ = identity(&b, Layout::File);
            let _ = identity(&b, Layout::Image);
        }
    }
}
