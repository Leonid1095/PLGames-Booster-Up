/// Builds WinDivert filter strings from game profile CIDRs and port ranges.
///
/// No Windows dependencies — fully cross-platform and unit-testable.

use std::net::Ipv4Addr;

/// Convert a CIDR string like "155.133.232.0/23" to (start_ip, end_ip).
/// Also accepts plain IPs like "155.133.232.1".
pub fn cidr_to_ip_range(cidr: &str) -> Result<(Ipv4Addr, Ipv4Addr), String> {
    if let Some((ip_str, prefix_str)) = cidr.split_once('/') {
        let ip: Ipv4Addr = ip_str.parse().map_err(|e| format!("Invalid IP '{}': {}", ip_str, e))?;
        let prefix: u32 = prefix_str
            .parse()
            .map_err(|e| format!("Invalid prefix '{}': {}", prefix_str, e))?;

        if prefix > 32 {
            return Err(format!("Invalid prefix length: {}", prefix));
        }

        let ip_u32 = u32::from(ip);
        let mask = if prefix == 0 {
            0u32
        } else {
            !0u32 << (32 - prefix)
        };
        let start = ip_u32 & mask;
        let end = start | !mask;

        Ok((Ipv4Addr::from(start), Ipv4Addr::from(end)))
    } else {
        // Plain IP address
        let ip: Ipv4Addr = cidr.parse().map_err(|e| format!("Invalid IP '{}': {}", cidr, e))?;
        Ok((ip, ip))
    }
}

/// Parse a port string: "27015" → (27015, 27015), "27015-27050" → (27015, 27050).
pub fn parse_port_range(port_str: &str) -> Result<(u16, u16), String> {
    if let Some((start_str, end_str)) = port_str.split_once('-') {
        let start: u16 = start_str
            .trim()
            .parse()
            .map_err(|e| format!("Invalid port '{}': {}", start_str, e))?;
        let end: u16 = end_str
            .trim()
            .parse()
            .map_err(|e| format!("Invalid port '{}': {}", end_str, e))?;
        if start > end {
            return Err(format!("Port range start {} > end {}", start, end));
        }
        Ok((start, end))
    } else {
        let port: u16 = port_str
            .trim()
            .parse()
            .map_err(|e| format!("Invalid port '{}': {}", port_str, e))?;
        Ok((port, port))
    }
}

/// Build a WinDivert filter string for intercepting outbound UDP traffic
/// to the given game server IPs (CIDRs) and ports.
///
/// Example output:
/// ```text
/// outbound and udp and (
///   (ip.DstAddr >= 155.133.232.0 and ip.DstAddr <= 155.133.233.255)
///   or (ip.DstAddr == 1.2.3.4)
/// ) and (
///   (udp.DstPort >= 27015 and udp.DstPort <= 27050)
///   or (udp.DstPort == 3478)
/// )
/// ```
pub fn build_windivert_filter(
    server_ips: &[String],
    ports: &[String],
) -> Result<String, String> {
    if server_ips.is_empty() {
        return Err("No server IPs provided".to_string());
    }
    if ports.is_empty() {
        return Err("No ports provided".to_string());
    }

    // Build IP clauses
    let mut ip_clauses = Vec::new();
    for cidr in server_ips {
        let (start, end) = cidr_to_ip_range(cidr)?;
        if start == end {
            ip_clauses.push(format!("ip.DstAddr == {}", start));
        } else {
            ip_clauses.push(format!(
                "(ip.DstAddr >= {} and ip.DstAddr <= {})",
                start, end
            ));
        }
    }

    // Build port clauses
    let mut port_clauses = Vec::new();
    for port_str in ports {
        let (start, end) = parse_port_range(port_str)?;
        if start == end {
            port_clauses.push(format!("udp.DstPort == {}", start));
        } else {
            port_clauses.push(format!(
                "(udp.DstPort >= {} and udp.DstPort <= {})",
                start, end
            ));
        }
    }

    // Combine
    let ip_filter = if ip_clauses.len() == 1 {
        ip_clauses[0].clone()
    } else {
        format!("({})", ip_clauses.join(" or "))
    };

    let port_filter = if port_clauses.len() == 1 {
        port_clauses[0].clone()
    } else {
        format!("({})", port_clauses.join(" or "))
    };

    Ok(format!(
        "outbound and udp and {} and {}",
        ip_filter, port_filter
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cidr_to_ip_range_24() {
        let (start, end) = cidr_to_ip_range("192.168.1.0/24").unwrap();
        assert_eq!(start, Ipv4Addr::new(192, 168, 1, 0));
        assert_eq!(end, Ipv4Addr::new(192, 168, 1, 255));
    }

    #[test]
    fn test_cidr_to_ip_range_23() {
        let (start, end) = cidr_to_ip_range("155.133.232.0/23").unwrap();
        assert_eq!(start, Ipv4Addr::new(155, 133, 232, 0));
        assert_eq!(end, Ipv4Addr::new(155, 133, 233, 255));
    }

    #[test]
    fn test_cidr_to_ip_range_32() {
        let (start, end) = cidr_to_ip_range("10.0.0.1/32").unwrap();
        assert_eq!(start, Ipv4Addr::new(10, 0, 0, 1));
        assert_eq!(end, Ipv4Addr::new(10, 0, 0, 1));
    }

    #[test]
    fn test_cidr_plain_ip() {
        let (start, end) = cidr_to_ip_range("8.8.8.8").unwrap();
        assert_eq!(start, Ipv4Addr::new(8, 8, 8, 8));
        assert_eq!(end, Ipv4Addr::new(8, 8, 8, 8));
    }

    #[test]
    fn test_cidr_to_ip_range_0() {
        let (start, end) = cidr_to_ip_range("0.0.0.0/0").unwrap();
        assert_eq!(start, Ipv4Addr::new(0, 0, 0, 0));
        assert_eq!(end, Ipv4Addr::new(255, 255, 255, 255));
    }

    #[test]
    fn test_cidr_invalid_prefix() {
        assert!(cidr_to_ip_range("1.2.3.4/33").is_err());
    }

    #[test]
    fn test_cidr_invalid_ip() {
        assert!(cidr_to_ip_range("999.999.999.999/24").is_err());
    }

    #[test]
    fn test_parse_port_single() {
        assert_eq!(parse_port_range("27015").unwrap(), (27015, 27015));
    }

    #[test]
    fn test_parse_port_range() {
        assert_eq!(parse_port_range("27015-27050").unwrap(), (27015, 27050));
    }

    #[test]
    fn test_parse_port_range_with_spaces() {
        assert_eq!(parse_port_range(" 3478 - 3480 ").unwrap(), (3478, 3480));
    }

    #[test]
    fn test_parse_port_invalid_range() {
        assert!(parse_port_range("27050-27015").is_err());
    }

    #[test]
    fn test_parse_port_invalid() {
        assert!(parse_port_range("abc").is_err());
    }

    #[test]
    fn test_build_filter_simple() {
        let filter = build_windivert_filter(
            &["155.133.232.0/23".to_string()],
            &["27015-27050".to_string()],
        )
        .unwrap();
        assert_eq!(
            filter,
            "outbound and udp and (ip.DstAddr >= 155.133.232.0 and ip.DstAddr <= 155.133.233.255) and (udp.DstPort >= 27015 and udp.DstPort <= 27050)"
        );
    }

    #[test]
    fn test_build_filter_single_ip_single_port() {
        let filter = build_windivert_filter(
            &["1.2.3.4".to_string()],
            &["443".to_string()],
        )
        .unwrap();
        assert_eq!(
            filter,
            "outbound and udp and ip.DstAddr == 1.2.3.4 and udp.DstPort == 443"
        );
    }

    #[test]
    fn test_build_filter_multiple() {
        let filter = build_windivert_filter(
            &[
                "155.133.232.0/23".to_string(),
                "185.25.180.0/24".to_string(),
            ],
            &["27015-27050".to_string(), "3478".to_string()],
        )
        .unwrap();
        assert!(filter.starts_with("outbound and udp and "));
        assert!(filter.contains("ip.DstAddr >= 155.133.232.0 and ip.DstAddr <= 155.133.233.255"));
        assert!(filter.contains("ip.DstAddr >= 185.25.180.0 and ip.DstAddr <= 185.25.180.255"));
        assert!(filter.contains("udp.DstPort >= 27015 and udp.DstPort <= 27050"));
        assert!(filter.contains("udp.DstPort == 3478"));
        assert!(filter.contains(" or "));
    }

    #[test]
    fn test_build_filter_no_ips() {
        assert!(build_windivert_filter(&[], &["27015".to_string()]).is_err());
    }

    #[test]
    fn test_build_filter_no_ports() {
        assert!(build_windivert_filter(&["1.2.3.4".to_string()], &[]).is_err());
    }
}
