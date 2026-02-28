/// PLG Protocol packet implementation.
///
/// Real wire format (matches `relay/src/protocol.rs`):
///
/// `[Token:4B][SeqNum:4B][Flags:1B][PathID:1B][Payload:NB]`
///
/// Header size: 10 bytes

pub const HEADER_SIZE: usize = 10;

// Flag bits
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
    /// Create a new data packet
    pub fn data(session_id: u32, seq_number: u32, payload: Vec<u8>) -> Self {
        Self {
            session_id,
            seq_number,
            flags: 0x00,
            path_id: 0,
            payload,
        }
    }

    /// Create a control packet (set forward target)
    pub fn control(session_id: u32, seq_number: u32, target: &str) -> Self {
        Self {
            session_id,
            seq_number,
            flags: FLAG_CONTROL,
            path_id: 0,
            payload: target.as_bytes().to_vec(),
        }
    }

    /// Create a keepalive packet
    pub fn keepalive(session_id: u32, seq_number: u32) -> Self {
        Self {
            session_id,
            seq_number,
            flags: FLAG_KEEPALIVE,
            path_id: 0,
            payload: vec![],
        }
    }

    /// Set multipath duplication flag and path_id
    pub fn with_multipath(mut self, path_id: u8) -> Self {
        self.flags |= FLAG_MULTIPATH_DUP;
        self.path_id = path_id;
        self
    }

    /// Serialize packet to bytes (for sending over UDP)
    pub fn encode(&self) -> Vec<u8> {
        let mut buf = Vec::with_capacity(HEADER_SIZE + self.payload.len());
        buf.extend_from_slice(&self.session_id.to_be_bytes());
        buf.extend_from_slice(&self.seq_number.to_be_bytes());
        buf.push(self.flags);
        buf.push(self.path_id);
        buf.extend_from_slice(&self.payload);
        buf
    }

    /// Parse packet from bytes (received over UDP)
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

    pub fn is_keepalive(&self) -> bool {
        self.flags & FLAG_KEEPALIVE != 0
    }

    pub fn is_control(&self) -> bool {
        self.flags & FLAG_CONTROL != 0
    }

    pub fn is_multipath_dup(&self) -> bool {
        self.flags & FLAG_MULTIPATH_DUP != 0
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_data_packet_encode_decode() {
        let pkt = PlgPacket::data(12345, 1, b"hello".to_vec());
        let encoded = pkt.encode();

        assert_eq!(encoded.len(), HEADER_SIZE + 5);

        let parsed = PlgPacket::parse(&encoded).unwrap();
        assert_eq!(parsed.session_id, 12345);
        assert_eq!(parsed.seq_number, 1);
        assert_eq!(parsed.flags, 0x00);
        assert_eq!(parsed.path_id, 0);
        assert_eq!(parsed.payload, b"hello");
    }

    #[test]
    fn test_control_packet() {
        let pkt = PlgPacket::control(99999, 0, "1.2.3.4:27015");
        let encoded = pkt.encode();

        let parsed = PlgPacket::parse(&encoded).unwrap();
        assert_eq!(parsed.session_id, 99999);
        assert!(parsed.is_control());
        assert!(!parsed.is_keepalive());
        assert_eq!(
            String::from_utf8(parsed.payload).unwrap(),
            "1.2.3.4:27015"
        );
    }

    #[test]
    fn test_keepalive_packet() {
        let pkt = PlgPacket::keepalive(42, 10);
        let encoded = pkt.encode();

        assert_eq!(encoded.len(), HEADER_SIZE); // No payload

        let parsed = PlgPacket::parse(&encoded).unwrap();
        assert_eq!(parsed.session_id, 42);
        assert_eq!(parsed.seq_number, 10);
        assert!(parsed.is_keepalive());
        assert!(!parsed.is_control());
        assert!(parsed.payload.is_empty());
    }

    #[test]
    fn test_multipath_flag() {
        let pkt = PlgPacket::data(1, 1, b"test".to_vec()).with_multipath(1);
        let encoded = pkt.encode();

        let parsed = PlgPacket::parse(&encoded).unwrap();
        assert!(parsed.is_multipath_dup());
        assert_eq!(parsed.path_id, 1);
        assert_eq!(parsed.flags, FLAG_MULTIPATH_DUP); // 0x01
    }

    #[test]
    fn test_parse_too_short() {
        assert!(PlgPacket::parse(&[]).is_none());
        assert!(PlgPacket::parse(&[0; 9]).is_none()); // Less than HEADER_SIZE
    }

    #[test]
    fn test_parse_exact_header() {
        // Exactly 10 bytes, empty payload
        let data = [0u8; HEADER_SIZE];
        let parsed = PlgPacket::parse(&data).unwrap();
        assert_eq!(parsed.session_id, 0);
        assert!(parsed.payload.is_empty());
    }

    #[test]
    fn test_big_endian_encoding() {
        // Token = 0x00003039 = 12345
        let pkt = PlgPacket::data(12345, 256, vec![]);
        let encoded = pkt.encode();

        // Token bytes (big-endian)
        assert_eq!(encoded[0], 0x00);
        assert_eq!(encoded[1], 0x00);
        assert_eq!(encoded[2], 0x30);
        assert_eq!(encoded[3], 0x39);

        // Seq bytes (big-endian): 256 = 0x00000100
        assert_eq!(encoded[4], 0x00);
        assert_eq!(encoded[5], 0x00);
        assert_eq!(encoded[6], 0x01);
        assert_eq!(encoded[7], 0x00);
    }

    #[test]
    fn test_max_token_value() {
        let pkt = PlgPacket::data(u32::MAX, u32::MAX, vec![0xFF]);
        let encoded = pkt.encode();
        let parsed = PlgPacket::parse(&encoded).unwrap();
        assert_eq!(parsed.session_id, u32::MAX);
        assert_eq!(parsed.seq_number, u32::MAX);
    }
}
