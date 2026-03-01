/// Builds raw IP+UDP packets for WinDivert injection.
///
/// When we receive a relay response, we need to construct a packet that looks
/// like it came from the real game server (src_ip:src_port) to the local
/// machine (dst_ip:dst_port). WinDivert will inject it into the network stack.
///
/// Manual packet construction with RFC 1071 checksums (no external deps).

use std::net::Ipv4Addr;

/// Build a raw IPv4+UDP packet with correct checksums.
///
/// Returns the complete IP packet bytes ready for WinDivert injection.
pub fn build_udp_response(
    src_ip: Ipv4Addr,
    dst_ip: Ipv4Addr,
    src_port: u16,
    dst_port: u16,
    payload: &[u8],
) -> Vec<u8> {
    let udp_len = 8 + payload.len() as u16;
    let total_len = 20 + udp_len;

    let mut buf = Vec::with_capacity(total_len as usize);

    // ── IPv4 Header (20 bytes, no options) ──────────────────────
    buf.push(0x45); // Version (4) + IHL (5)
    buf.push(0x00); // DSCP/ECN
    buf.extend_from_slice(&total_len.to_be_bytes()); // Total Length
    buf.extend_from_slice(&[0x00, 0x00]); // Identification
    buf.extend_from_slice(&[0x40, 0x00]); // Flags (Don't Fragment) + Fragment Offset
    buf.push(64); // TTL
    buf.push(17); // Protocol: UDP
    buf.extend_from_slice(&[0x00, 0x00]); // Header Checksum (placeholder)
    buf.extend_from_slice(&src_ip.octets()); // Source IP
    buf.extend_from_slice(&dst_ip.octets()); // Destination IP

    // Compute IP header checksum
    let ip_checksum = compute_ip_checksum(&buf[..20]);
    buf[10] = (ip_checksum >> 8) as u8;
    buf[11] = (ip_checksum & 0xFF) as u8;

    // ── UDP Header (8 bytes) ────────────────────────────────────
    buf.extend_from_slice(&src_port.to_be_bytes()); // Source Port
    buf.extend_from_slice(&dst_port.to_be_bytes()); // Destination Port
    buf.extend_from_slice(&udp_len.to_be_bytes()); // UDP Length
    buf.extend_from_slice(&[0x00, 0x00]); // UDP Checksum (placeholder)

    // ── Payload ─────────────────────────────────────────────────
    buf.extend_from_slice(payload);

    // Compute UDP checksum (with pseudo-header)
    let udp_checksum = compute_udp_checksum(
        &src_ip.octets(),
        &dst_ip.octets(),
        &buf[20..], // UDP header + payload
    );
    buf[26] = (udp_checksum >> 8) as u8;
    buf[27] = (udp_checksum & 0xFF) as u8;

    buf
}

/// Internet checksum (RFC 1071) for IPv4 header.
fn compute_ip_checksum(header: &[u8]) -> u16 {
    let mut sum: u32 = 0;
    let mut i = 0;
    while i < header.len() {
        if i == 10 {
            // Skip checksum field
            i += 2;
            continue;
        }
        let word = if i + 1 < header.len() {
            ((header[i] as u32) << 8) | (header[i + 1] as u32)
        } else {
            (header[i] as u32) << 8
        };
        sum += word;
        i += 2;
    }

    while (sum >> 16) != 0 {
        sum = (sum & 0xFFFF) + (sum >> 16);
    }

    !sum as u16
}

/// UDP checksum with IPv4 pseudo-header.
fn compute_udp_checksum(src_ip: &[u8; 4], dst_ip: &[u8; 4], udp_segment: &[u8]) -> u16 {
    let mut sum: u32 = 0;

    // Pseudo-header: src_ip (4) + dst_ip (4) + zero (1) + protocol (1) + UDP length (2)
    sum += ((src_ip[0] as u32) << 8) | (src_ip[1] as u32);
    sum += ((src_ip[2] as u32) << 8) | (src_ip[3] as u32);
    sum += ((dst_ip[0] as u32) << 8) | (dst_ip[1] as u32);
    sum += ((dst_ip[2] as u32) << 8) | (dst_ip[3] as u32);
    sum += 17u32; // Protocol: UDP
    sum += udp_segment.len() as u32; // UDP length

    // UDP header + data (skip checksum field at offset 6-7)
    let mut i = 0;
    while i < udp_segment.len() {
        if i == 6 {
            // Skip checksum field
            i += 2;
            continue;
        }
        let word = if i + 1 < udp_segment.len() {
            ((udp_segment[i] as u32) << 8) | (udp_segment[i + 1] as u32)
        } else {
            (udp_segment[i] as u32) << 8
        };
        sum += word;
        i += 2;
    }

    while (sum >> 16) != 0 {
        sum = (sum & 0xFFFF) + (sum >> 16);
    }

    let result = !sum as u16;
    // UDP checksum of 0x0000 is transmitted as 0xFFFF
    if result == 0 {
        0xFFFF
    } else {
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_build_udp_response_basic() {
        let pkt = build_udp_response(
            Ipv4Addr::new(1, 2, 3, 4),
            Ipv4Addr::new(10, 0, 0, 1),
            27015,
            12345,
            b"hello",
        );

        // Total: 20 (IP) + 8 (UDP) + 5 (payload) = 33
        assert_eq!(pkt.len(), 33);

        // IP version + IHL
        assert_eq!(pkt[0], 0x45);
        // Protocol = UDP (17)
        assert_eq!(pkt[9], 17);
        // Source IP
        assert_eq!(&pkt[12..16], &[1, 2, 3, 4]);
        // Dest IP
        assert_eq!(&pkt[16..20], &[10, 0, 0, 1]);

        // UDP src port = 27015
        assert_eq!(u16::from_be_bytes([pkt[20], pkt[21]]), 27015);
        // UDP dst port = 12345
        assert_eq!(u16::from_be_bytes([pkt[22], pkt[23]]), 12345);
        // UDP length = 8 + 5 = 13
        assert_eq!(u16::from_be_bytes([pkt[24], pkt[25]]), 13);

        // Payload
        assert_eq!(&pkt[28..33], b"hello");
    }

    #[test]
    fn test_build_udp_response_empty_payload() {
        let pkt = build_udp_response(
            Ipv4Addr::new(192, 168, 0, 1),
            Ipv4Addr::new(192, 168, 0, 2),
            80,
            1234,
            &[],
        );

        // Total: 20 + 8 = 28
        assert_eq!(pkt.len(), 28);
        // UDP length = 8
        assert_eq!(u16::from_be_bytes([pkt[24], pkt[25]]), 8);
    }

    #[test]
    fn test_ip_total_length() {
        let payload = vec![0xAB; 100];
        let pkt = build_udp_response(
            Ipv4Addr::new(10, 0, 0, 1),
            Ipv4Addr::new(10, 0, 0, 2),
            5000,
            6000,
            &payload,
        );

        let total_len = u16::from_be_bytes([pkt[2], pkt[3]]);
        assert_eq!(total_len, 20 + 8 + 100);
        assert_eq!(pkt.len(), 128);
    }

    #[test]
    fn test_ip_checksum_valid() {
        let pkt = build_udp_response(
            Ipv4Addr::new(1, 2, 3, 4),
            Ipv4Addr::new(5, 6, 7, 8),
            1000,
            2000,
            b"test",
        );

        // Verify IP checksum: sum of all 16-bit words in header should be 0xFFFF
        let mut sum: u32 = 0;
        for i in (0..20).step_by(2) {
            sum += ((pkt[i] as u32) << 8) | (pkt[i + 1] as u32);
        }
        while (sum >> 16) != 0 {
            sum = (sum & 0xFFFF) + (sum >> 16);
        }
        assert_eq!(sum as u16, 0xFFFF);
    }

    #[test]
    fn test_udp_checksum_nonzero() {
        let pkt = build_udp_response(
            Ipv4Addr::new(10, 0, 0, 1),
            Ipv4Addr::new(10, 0, 0, 2),
            27015,
            27015,
            b"game data here",
        );

        let udp_checksum = u16::from_be_bytes([pkt[26], pkt[27]]);
        assert_ne!(udp_checksum, 0);
    }

    #[test]
    fn test_ttl_and_flags() {
        let pkt = build_udp_response(
            Ipv4Addr::new(1, 1, 1, 1),
            Ipv4Addr::new(2, 2, 2, 2),
            80,
            80,
            &[],
        );

        // TTL = 64
        assert_eq!(pkt[8], 64);
        // Flags: Don't Fragment (0x40), Fragment Offset: 0
        assert_eq!(pkt[6], 0x40);
        assert_eq!(pkt[7], 0x00);
    }

    #[test]
    fn test_large_payload() {
        let payload = vec![0xFF; 1400]; // Typical MTU-sized payload
        let pkt = build_udp_response(
            Ipv4Addr::new(192, 168, 1, 1),
            Ipv4Addr::new(192, 168, 1, 2),
            27015,
            27016,
            &payload,
        );

        assert_eq!(pkt.len(), 20 + 8 + 1400);
        assert_eq!(&pkt[28..], &payload[..]);
    }
}
