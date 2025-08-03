# FarmNetworks Admin Dashboard - Statistics & Functionality Explanation

## 📊 Dashboard Statistics Overview

### 1. **Total Devices**
- **Definition**: Count of all registered IoT devices in the `devices` table
- **Calculation**: `SELECT COUNT(*) FROM devices`
- **Growth**: Percentage change from previous month
- **Purpose**: Shows the total scale of the IoT network

### 2. **Active Masters (Gateways)**
- **Definition**: Count of gateways with status = 'active'
- **Calculation**: `SELECT COUNT(*) FROM gateways WHERE status = 'active'`
- **Growth**: Percentage change from previous month
- **Purpose**: Indicates how many communication hubs are functioning properly

### 3. **Monthly Earnings**
- **Definition**: Total revenue from all sellers for the current month
- **Calculation**: `SELECT SUM(total_amount) FROM seller_earnings WHERE month_year = 'YYYY-MM'`
- **Growth**: Percentage change from previous month
- **Purpose**: Financial performance indicator

### 4. **Online Devices**
- **Definition**: Devices with motor_status = 1 (motor is running/active)
- **Calculation**: `SELECT COUNT(*) FROM devices WHERE motor_status = 1`
- **Growth**: Percentage change from previous month
- **Purpose**: Shows operational devices in real-time

## 🔄 Device Status Pie Chart

### **Online vs Offline Classification**
- **Online Devices**: `motor_status = 1` (Motor is running/active)
- **Offline Devices**: `motor_status = 0` (Motor is stopped/inactive)

### **Why Motor Status?**
- More accurate than timestamp-based detection
- Reflects actual device operational state
- Real-time status from IoT sensors
- Indicates whether irrigation systems are actively working

### **Percentage Calculation**
```javascript
const total = online + offline;
const onlinePercent = (online / total) * 100;
const offlinePercent = (offline / total) * 100;
```

## 🌐 Gateway Management System

### **Gateway Status Types**
1. **Active** (`status = 'active'`)
   - Gateway is functioning normally
   - Can communicate with devices
   - Accepting new device connections

2. **Inactive** (`status = 'inactive'`)
   - Gateway is blocked/disabled
   - Cannot communicate with devices
   - Admin has blocked this gateway

3. **Maintenance** (`status = 'maintenance'`)
   - Gateway is under maintenance
   - Temporarily unavailable
   - Scheduled maintenance mode

### **Gateway Management Features**

#### **Block Gateway**
- Changes status from 'active' to 'inactive'
- Prevents device communication
- Useful for troubleshooting or security

#### **Unblock Gateway**
- Changes status from 'inactive' to 'active'
- Restores device communication
- Re-enables gateway functionality

#### **Gateway Information Displayed**
- Gateway name and ID
- Associated seller information
- Device count (current/maximum)
- Location coordinates
- Creation date
- Current status

## 📈 Monthly Growth Chart

### **Data Source**
- Counts devices added each month
- Shows growth trends over 6 months
- Helps identify seasonal patterns

### **Calculation**
```sql
SELECT COUNT(*) as device_count, 
       DATE_TRUNC('month', created_at) as month
FROM devices 
WHERE created_at >= (CURRENT_DATE - INTERVAL '6 months')
GROUP BY DATE_TRUNC('month', created_at)
ORDER BY month;
```

## 🔧 Technical Implementation

### **Database Schema Integration**
```sql
-- Devices table with motor_status
CREATE TABLE devices (
  id uuid PRIMARY KEY,
  device_id text UNIQUE,
  motor_status smallint DEFAULT 0, -- 0=offline, 1=online
  -- ... other fields
);

-- Gateways table with status management
CREATE TABLE gateways (
  id uuid PRIMARY KEY,
  name text,
  status text DEFAULT 'active', -- 'active', 'inactive', 'maintenance'
  seller_id uuid REFERENCES seller_profiles(id),
  -- ... other fields
);
```

### **Real-time Updates**
- Auto-refresh every 30 seconds
- WebSocket subscriptions for live updates
- Immediate status changes reflected in UI

### **Error Handling**
- Graceful degradation when data unavailable
- Loading states for better UX
- Error messages for failed operations

## 🎯 Key Benefits

### **For Administrators**
1. **Real-time Monitoring**: Live status of all devices and gateways
2. **Quick Actions**: Block/unblock gateways with one click
3. **Performance Tracking**: Monthly growth and earnings trends
4. **Troubleshooting**: Identify problematic gateways quickly

### **For System Health**
1. **Operational Visibility**: Clear view of online vs offline devices
2. **Network Management**: Control gateway access and communication
3. **Financial Tracking**: Monitor revenue and growth metrics
4. **Maintenance Planning**: Identify patterns for proactive maintenance

## 🔍 Usage Examples

### **Scenario 1: Device Outage**
1. Admin notices high offline device count
2. Checks gateway status in Gateway Management
3. Identifies problematic gateway
4. Blocks gateway to prevent further issues
5. Monitors recovery after maintenance

### **Scenario 2: Growth Analysis**
1. Admin reviews monthly growth chart
2. Identifies seasonal patterns
3. Plans capacity for peak periods
4. Adjusts gateway allocation accordingly

### **Scenario 3: Financial Monitoring**
1. Admin tracks monthly earnings
2. Compares with previous months
3. Identifies revenue trends
4. Makes strategic decisions based on data

## 📱 Mobile Responsiveness

All dashboard components are fully responsive:
- Collapsible sidebar for mobile
- Touch-friendly interface
- Optimized charts for small screens
- Accessible navigation

## 🔐 Security Considerations

- Admin-only access to gateway management
- Confirmation dialogs for destructive actions
- Audit trail for status changes
- Role-based permissions

This comprehensive dashboard provides administrators with complete visibility and control over the FarmNetworks IoT infrastructure, enabling proactive management and informed decision-making. 