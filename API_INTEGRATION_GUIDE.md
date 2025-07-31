# CyberPulse API Integration Guide

This guide explains how to integrate real-time threat intelligence APIs to replace the current mock data system.

## Current Status

✅ **Frontend**: Real-time world map with continent outlines and threat visualization  
✅ **Mock Data**: System generates random threats every 2 seconds  
❌ **Real APIs**: Need to integrate actual threat intelligence sources  

## Required APIs and Setup

### 1. Shodan Stream API
**Purpose**: Real-time internet scanning and vulnerability detection  
**Website**: https://shodan.io  

**Setup Steps**:
1. Sign up for Shodan account
2. Get API key from account dashboard
3. Add to environment variables:
   ```bash
   SHODAN_API_KEY=your_api_key_here
   ```

**Integration**:
- Create ingest worker: `/workers/shodan-ingest.js`
- Parse Shodan stream data and extract:
  - IP addresses → convert to lat/lng using GeoIP
  - Vulnerability types → map to threat types
  - Severity levels → normalize to our scale
- Send to Kafka topic `threats`

### 2. X-Force Exchange API (IBM)
**Purpose**: Threat intelligence and IP reputation data  
**Website**: https://exchange.xforce.ibmcloud.com/  

**Setup Steps**:
1. Create IBM Cloud account
2. Get API credentials
3. Add to environment variables:
   ```bash
   XFORCE_API_KEY=your_api_key
   XFORCE_API_PASSWORD=your_api_password
   ```

**Integration**:
- Create worker: `/workers/xforce-ingest.js`
- Query IP reputation data every 30 seconds
- Map threat indicators to our ThreatEvent format

### 3. VirusTotal API
**Purpose**: Malware detection and file analysis  
**Website**: https://virustotal.com/  

**Setup Steps**:
1. Sign up for VirusTotal account
2. Get API key from profile
3. Add to environment variables:
   ```bash
   VIRUSTOTAL_API_KEY=your_api_key_here
   ```

**Integration**:
- Create worker: `/workers/virustotal-ingest.js`
- Monitor malware detections
- Extract geographic data from submissions

### 4. GeoIP Database
**Purpose**: Convert IP addresses to geographic coordinates  
**Options**: MaxMind GeoLite2 (free) or GeoIP2 (paid)  

**Setup Steps**:
1. Sign up for MaxMind account
2. Download GeoLite2 database
3. Add to `/data/geoip/` directory
4. Update worker to use GeoIP lookups

## Backend Infrastructure Changes

### 1. Message Queue Setup
**Current**: Basic Kafka setup  
**Needed**: 
- Topic: `threats` (partitioned by region)
- Topic: `threat-updates` (for status changes)
- Consumer groups for different data sources

### 2. WebSocket Server Enhancement
**File**: `/backend/websocket-server.js`  
**Changes Needed**:
- Add threat filtering by severity
- Add geographic filtering
- Rate limiting for clients
- Authentication for premium features

### 3. Data Processing Pipeline
**Create**: `/workers/data-processor.js`  
**Functions**:
- Normalize threat data from different sources
- Apply geo-IP lookups
- Deduplication logic
- Threat scoring algorithm

## Environment Variables Required

Create a `.env` file in the root directory:

```env
# Threat Intelligence APIs
SHODAN_API_KEY=your_shodan_key
XFORCE_API_KEY=your_xforce_key
XFORCE_API_PASSWORD=your_xforce_password
VIRUSTOTAL_API_KEY=your_virustotal_key

# GeoIP
GEOIP_DATABASE_PATH=/data/geoip/GeoLite2-City.mmdb

# Kafka Configuration
KAFKA_BROKERS=localhost:9092
KAFKA_TOPIC_THREATS=threats
KAFKA_TOPIC_UPDATES=threat-updates

# WebSocket
WS_PORT=8081
WS_MAX_CONNECTIONS=1000

# Database
MONGODB_URI=mongodb://localhost:27017/cyberpulse
INFLUXDB_URL=http://localhost:8086
INFLUXDB_TOKEN=your_token
INFLUXDB_ORG=cyberpulse
INFLUXDB_BUCKET=threats

# Rate Limiting
RATE_LIMIT_REQUESTS_PER_MINUTE=100
```

## Implementation Priority

### Phase 1: Core Data Pipeline
1. **Shodan Integration** (highest impact)
   - Real-time scanning data
   - Global coverage
   - High volume of threats

2. **GeoIP Database** (required for all APIs)
   - IP to location conversion
   - Accurate mapping

3. **Data Normalization** (essential)
   - Consistent ThreatEvent format
   - Duplicate detection

### Phase 2: Additional Sources
1. **X-Force Integration**
   - IP reputation data
   - Malware indicators

2. **VirusTotal Integration**
   - Malware analysis
   - File-based threats

### Phase 3: Advanced Features
1. **Threat Correlation**
   - Multi-source validation
   - Pattern detection

2. **Historical Analysis**
   - Trend detection
   - Predictive analytics

## API Rate Limits & Costs

| API | Free Tier | Rate Limit | Paid Plans |
|-----|-----------|------------|------------|
| Shodan | 100 queries/month | 1 req/sec | $49/month for streaming |
| X-Force | 1000 queries/month | 10 req/min | Contact for pricing |
| VirusTotal | 500 queries/day | 4 req/min | $180/month |
| MaxMind GeoIP | 1000 queries/day | N/A | $50/month |

## File Structure for API Integration

```
/workers/
├── shodan-ingest.js          # Shodan stream processing
├── xforce-ingest.js          # X-Force API integration
├── virustotal-ingest.js      # VirusTotal API integration
├── data-processor.js         # Data normalization
└── geoip-service.js          # IP to location conversion

/backend/
├── websocket-server.js       # Enhanced WebSocket server
├── threat-controller.js      # Threat data API
└── rate-limiter.js          # API rate limiting

/data/
├── geoip/                   # GeoIP database files
└── schemas/                 # Data validation schemas
```

## Testing Your Setup

1. **Start with Mock Data**: Current system works with simulated threats
2. **Add GeoIP First**: Test IP to location conversion
3. **Integrate One API**: Start with Shodan for immediate results
4. **Monitor Performance**: Check WebSocket latency and threat processing speed
5. **Scale Gradually**: Add more APIs as system proves stable

## Next Steps

1. Sign up for API accounts
2. Set up environment variables
3. Create the first ingest worker (Shodan recommended)
4. Test with small data volumes
5. Monitor system performance
6. Scale up gradually

## Support and Troubleshooting

- **Rate Limits**: Implement exponential backoff
- **API Failures**: Add retry logic with circuit breakers
- **Data Quality**: Validate all incoming data
- **Performance**: Monitor Kafka lag and WebSocket connections

---

**Note**: This is a defensive cyber security tool. All APIs should be used in compliance with their terms of service and for legitimate security research purposes only.