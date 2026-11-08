//! Writes a value as a Rust expression that builds it.
//!
//! `build.rs` uses this to compile the library into the plugin, so the data
//! is checked at build time and nothing is parsed when the game starts. It
//! works through `Serialize`, and relies on the library's types serializing
//! with their Rust names: field names as declared, and variant names as
//! declared, since their JSON names are set for deserializing only.

use serde::ser::{self, Serialize};
use std::fmt::{self, Write};

#[derive(Debug)]
pub struct Error(String);

impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.0)
    }
}

impl std::error::Error for Error {}

impl ser::Error for Error {
    fn custom<T: fmt::Display>(msg: T) -> Self {
        Error(msg.to_string())
    }
}

/// The Rust expression for a value. Type names in it are unqualified, so the
/// code that includes it must have them in scope.
pub fn to_rust<T: Serialize>(value: &T) -> Result<String, Error> {
    let mut out = String::new();
    value.serialize(&mut Writer { out: &mut out })?;
    Ok(out)
}

struct Writer<'a> {
    out: &'a mut String,
}

type Res = Result<(), Error>;

impl Writer<'_> {
    fn put(&mut self, s: &str) -> Res {
        self.out.push_str(s);
        Ok(())
    }
}

macro_rules! int {
    ($name:ident, $t:ty) => {
        fn $name(self, v: $t) -> Res {
            let _ = write!(self.out, "{v}");
            Ok(())
        }
    };
}

impl<'a, 'b> ser::Serializer for &'a mut Writer<'b> {
    type Ok = ();
    type Error = Error;
    type SerializeSeq = Seq<'a, 'b>;
    type SerializeTuple = Seq<'a, 'b>;
    type SerializeTupleStruct = Seq<'a, 'b>;
    type SerializeTupleVariant = Seq<'a, 'b>;
    type SerializeMap = Map<'a, 'b>;
    type SerializeStruct = Fields<'a, 'b>;
    type SerializeStructVariant = Fields<'a, 'b>;

    fn serialize_bool(self, v: bool) -> Res {
        self.put(if v { "true" } else { "false" })
    }
    int!(serialize_u8, u8);
    int!(serialize_u16, u16);
    int!(serialize_u32, u32);
    int!(serialize_u64, u64);
    int!(serialize_i8, i8);
    int!(serialize_i16, i16);
    int!(serialize_i32, i32);
    fn serialize_i64(self, v: i64) -> Res {
        if v == i64::MIN {
            self.put("i64::MIN")
        } else {
            let _ = write!(self.out, "{v}");
            Ok(())
        }
    }
    fn serialize_f32(self, _: f32) -> Res {
        Err(Error("floats can't be written".into()))
    }
    fn serialize_f64(self, _: f64) -> Res {
        Err(Error("floats can't be written".into()))
    }
    fn serialize_char(self, v: char) -> Res {
        let _ = write!(self.out, "{v:?}");
        Ok(())
    }
    fn serialize_str(self, v: &str) -> Res {
        let _ = write!(self.out, "String::from({v:?})");
        Ok(())
    }
    fn serialize_bytes(self, v: &[u8]) -> Res {
        let _ = write!(self.out, "vec!{v:?}");
        Ok(())
    }
    fn serialize_none(self) -> Res {
        self.put("None")
    }
    fn serialize_some<T: ?Sized + Serialize>(self, v: &T) -> Res {
        self.put("Some(")?;
        v.serialize(&mut *self)?;
        self.put(")")
    }
    fn serialize_unit(self) -> Res {
        self.put("()")
    }
    fn serialize_unit_struct(self, name: &'static str) -> Res {
        self.put(name)
    }
    fn serialize_unit_variant(self, name: &'static str, _: u32, variant: &'static str) -> Res {
        let _ = write!(self.out, "{name}::{variant}");
        Ok(())
    }
    fn serialize_newtype_struct<T: ?Sized + Serialize>(self, name: &'static str, v: &T) -> Res {
        let _ = write!(self.out, "{name}(");
        v.serialize(&mut *self)?;
        self.put(")")
    }
    fn serialize_newtype_variant<T: ?Sized + Serialize>(self, name: &'static str, _: u32, variant: &'static str, v: &T) -> Res {
        let _ = write!(self.out, "{name}::{variant}(");
        v.serialize(&mut *self)?;
        self.put(")")
    }
    fn serialize_seq(self, _: Option<usize>) -> Result<Seq<'a, 'b>, Error> {
        self.put("vec![")?;
        Ok(Seq { w: self, first: true, close: "]" })
    }
    fn serialize_tuple(self, _: usize) -> Result<Seq<'a, 'b>, Error> {
        // The library uses tuples only for fixed-size arrays.
        self.put("[")?;
        Ok(Seq { w: self, first: true, close: "]" })
    }
    fn serialize_tuple_struct(self, name: &'static str, _: usize) -> Result<Seq<'a, 'b>, Error> {
        let _ = write!(self.out, "{name}(");
        Ok(Seq { w: self, first: true, close: ")" })
    }
    fn serialize_tuple_variant(self, name: &'static str, _: u32, variant: &'static str, _: usize) -> Result<Seq<'a, 'b>, Error> {
        let _ = write!(self.out, "{name}::{variant}(");
        Ok(Seq { w: self, first: true, close: ")" })
    }
    fn serialize_map(self, _: Option<usize>) -> Result<Map<'a, 'b>, Error> {
        self.put("::std::collections::BTreeMap::from([")?;
        Ok(Map { w: self, first: true })
    }
    fn serialize_struct(self, name: &'static str, _: usize) -> Result<Fields<'a, 'b>, Error> {
        let _ = write!(self.out, "{name} {{");
        Ok(Fields { w: self })
    }
    fn serialize_struct_variant(self, name: &'static str, _: u32, variant: &'static str, _: usize) -> Result<Fields<'a, 'b>, Error> {
        let _ = write!(self.out, "{name}::{variant} {{");
        Ok(Fields { w: self })
    }
}

pub struct Seq<'a, 'b> {
    w: &'a mut Writer<'b>,
    first: bool,
    close: &'static str,
}

impl Seq<'_, '_> {
    fn item<T: ?Sized + Serialize>(&mut self, v: &T) -> Res {
        if !self.first {
            self.w.put(",")?;
        }
        self.first = false;
        v.serialize(&mut *self.w)
    }
    fn finish(self) -> Res {
        self.w.put(self.close)
    }
}

impl ser::SerializeSeq for Seq<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_element<T: ?Sized + Serialize>(&mut self, v: &T) -> Res {
        self.item(v)
    }
    fn end(self) -> Res {
        self.finish()
    }
}

impl ser::SerializeTuple for Seq<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_element<T: ?Sized + Serialize>(&mut self, v: &T) -> Res {
        self.item(v)
    }
    fn end(self) -> Res {
        self.finish()
    }
}

impl ser::SerializeTupleStruct for Seq<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_field<T: ?Sized + Serialize>(&mut self, v: &T) -> Res {
        self.item(v)
    }
    fn end(self) -> Res {
        self.finish()
    }
}

impl ser::SerializeTupleVariant for Seq<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_field<T: ?Sized + Serialize>(&mut self, v: &T) -> Res {
        self.item(v)
    }
    fn end(self) -> Res {
        self.finish()
    }
}

pub struct Map<'a, 'b> {
    w: &'a mut Writer<'b>,
    first: bool,
}

impl ser::SerializeMap for Map<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_key<T: ?Sized + Serialize>(&mut self, k: &T) -> Res {
        if !self.first {
            self.w.put(",")?;
        }
        self.first = false;
        self.w.put("(")?;
        k.serialize(&mut *self.w)
    }
    fn serialize_value<T: ?Sized + Serialize>(&mut self, v: &T) -> Res {
        self.w.put(",")?;
        v.serialize(&mut *self.w)?;
        self.w.put(")")
    }
    fn end(self) -> Res {
        self.w.put("])")
    }
}

pub struct Fields<'a, 'b> {
    w: &'a mut Writer<'b>,
}

impl ser::SerializeStruct for Fields<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_field<T: ?Sized + Serialize>(&mut self, key: &'static str, v: &T) -> Res {
        let _ = write!(self.w.out, "{key}: ");
        v.serialize(&mut *self.w)?;
        self.w.put(",")
    }
    fn end(self) -> Res {
        self.w.put("}")
    }
}

impl ser::SerializeStructVariant for Fields<'_, '_> {
    type Ok = ();
    type Error = Error;
    fn serialize_field<T: ?Sized + Serialize>(&mut self, key: &'static str, v: &T) -> Res {
        let _ = write!(self.w.out, "{key}: ");
        v.serialize(&mut *self.w)?;
        self.w.put(",")
    }
    fn end(self) -> Res {
        self.w.put("}")
    }
}

#[cfg(test)]
mod tests {
    use super::to_rust;
    use crate::encoding::Encoding;
    use crate::game::ReqType;
    use crate::library::{Availability, Location, Reliability};
    use std::collections::BTreeMap;

    #[test]
    fn writes_rust_names() {
        assert_eq!(to_rust(&Encoding::Neg16).unwrap(), "Encoding::Neg16");
        assert_eq!(to_rust(&Encoding::ByteOf { index: 1, width: 2 }).unwrap(), "Encoding::ByteOf {index: 1,width: 2,}");
        assert_eq!(to_rust(&Some("a\"b".to_string())).unwrap(), r#"Some(String::from("a\"b"))"#);
        assert_eq!(to_rust(&[1u16, 2, 3, 4]).unwrap(), "[1,2,3,4]");
        assert_eq!(to_rust(&vec![-5i64, i64::MIN]).unwrap(), "vec![-5,i64::MIN]");
        let m: BTreeMap<ReqType, u8> = [(ReqType::TechUse, 1)].into();
        assert_eq!(to_rust(&m).unwrap(), "::std::collections::BTreeMap::from([(ReqType::TechUse,1)])");
        #[derive(serde::Serialize)]
        struct S {
            m: BTreeMap<u8, u8>,
        }
        assert_eq!(to_rust(&S { m: BTreeMap::new() }).unwrap(), "S {m: ::std::collections::BTreeMap::from([]),}");
        let a = Availability::Locations { locations: vec![Location { rva: 16, encoding: Encoding::U8, scale: 1, expected: vec![2] }], reliability: Reliability::default() };
        assert_eq!(
            to_rust(&a).unwrap(),
            "Availability::Locations {locations: vec![Location {rva: 16,encoding: Encoding::U8,scale: 1,expected: vec![2],}],reliability: Reliability {unconfirmed: false,incomplete: false,},}"
        );
    }
}
