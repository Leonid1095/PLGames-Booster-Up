/// PLG Protocol packet format:
///
/// Offset  Size   Field
/// 0       4      Session ID
/// 4       4      Sequence Number
/// 8       1      Flags (0x01=multipath_dup, 0x02=keepalive, 0x04=control, 0x08=compressed)
/// 9       1      Path ID (0=primary, 1=backup)
/// 10      N      Payload (original game UDP packet)
///
/// Total overhead: 10 bytes

pub const HEADER_SIZE: usize = 10;

pub const FLAG_MULTIPATH_DUP: u8 = 0x01;
pub const FLAG_KEEPALIVE: u8 = 0x02;
pub const FLAG_CONTROL: u8 = 0x04;
pub const FLAG_COMPRESSED: u8 = 0x08;

#[derive(Debug, Clone)]
pub struct PlgPacket {
    pub session_id: u32,
    pub seq_number: u32,
    pub flags: u8,
    pub path_id: u8,
    pub payload: Vec<u8>,
}

impl PlgPacket {
    pub fn parse(data: &[u8]) -> Option<Self> {
        if data.len() < HEADER_SIZE {
            return None;
        }

        let session_id = u32::from_be_bytes([data[0], data[1], data[2], data[3]]);
        let seq_number = u32::from_be_bytes([data[4], data[5], data[6], data[7]]);
        let flags = data[8];
        let path_id = data[9];
        let payload = data[HEADER_SIZE..].to_vec();

        Some(Self {
            session_id,
            seq_number,
            flags,
            path_id,
            payload,
        })
    }

    pub fn serialize(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(HEADER_SIZE + self.payload.len());
        buf.extend_from_slice(&self.session_id.to_be_bytes());
        buf.extend_from_slice(&self.seq_number.to_be_bytes());
        buf.push(self.flags);
        buf.push(self.path_id);
        buf.extend_from_slice(&self.payload);
        buf
    }

    pub fn is_keepalive(&self) -> bool {
        self.flags & FLAG_KEEPALIVE != 0
    }

    pub fn is_multipath_dup(&self) -> bool {
        self.flags & FLAG_MULTIPATH_DUP != 0
    }

    pub fn is_control(&self) -> bool {
        self.flags & FLAG_CONTROL != 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_and_serialize() {
        let original = PlgPacket {
            session_id: 12345,
            seq_number: 1,
            flags: 0,
            path_id: 0,
            payload: vec![0xDE, 0xAD, 0xBE, 0xEF],
        };

        let bytes = original.serialize();
        assert_eq!(bytes.len(), HEADER_SIZE + 4);

        let parsed = PlgPacket::parse(&bytes).unwrap();
        assert_eq!(parsed.session_id, 12345);
        assert_eq!(parsed.seq_number, 1);
        assert_eq!(parsed.flags, 0);
        assert_eq!(parsed.path_id, 0);
        assert_eq!(parsed.payload, vec![0xDE, 0xAD, 0xBE, 0xEF]);
    }

    #[test]
    fn test_flags() {
        let pkt = PlgPacket {
            session_id: 1,
            seq_number: 1,
            flags: FLAG_KEEPALIVE | FLAG_MULTIPATH_DUP,
            path_id: 1,
            payload: vec![],
        };
        assert!(pkt.is_keepalive());
        assert!(pkt.is_multipath_dup());
        assert!(!pkt.is_control());
    }

    #[test]
    fn test_too_short() {
        let data = vec![0u8; 5];
        assert!(PlgPacket::parse(&data).is_none());
    }
}
