// Device Map Utility Functions

// 1. Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_SUPABASE_URL';
const supabaseKey = 'YOUR_SUPABASE_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Data Fetching Functions
export async function fetchGatewaysWithRelations() {
  try {
    const { data, error } = await supabase
      .from('gateways')
      .select(`
        *,
        owned_by_profile:seller_profiles!gateways_owned_by_fkey(
          id,
          business_name,
          business_type,
          address,
          city,
          state
        ),
        managed_by_profile:admin_profiles!gateways_managed_by_fkey(
          id,
          permissions,
          department,
          access_level
        ),
        devices(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching gateways:', err);
    return { data: [], error: err.message };
  }
}

export async function fetchDevicesWithRelations() {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        user_profile:user_profiles(
          id,
          full_name,
          email,
          phone,
          username
        ),
        gateway:gateways(
          id,
          name,
          status,
          address
        ),
        seller_profile:seller_profiles(
          id,
          business_name,
          business_type
        )
      `)
      .order('last_updated', { ascending: false });

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching devices:', err);
    return { data: [], error: err.message };
  }
}

export async function fetchGatewayDevices(gatewayId) {
  try {
    const { data, error } = await supabase
      .from('devices')
      .select(`
        *,
        user_profile:user_profiles(
          id,
          full_name,
          email,
          phone
        ),
        seller_profile:seller_profiles(
          id,
          business_name
        )
      `)
      .eq('gateway_id', gatewayId)
      .order('device_name');

    if (error) throw error;
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Error fetching gateway devices:', err);
    return { data: [], error: err.message };
  }
}

// 3. Statistics Calculation Functions
export function calculateStats(gateways, devices) {
  const totalGateways = gateways.length;
  const activeGateways = gateways.filter(g => g.status === 'active').length;
  const totalDevices = devices.length;
  const onlineDevices = devices.filter(d => d.motor_status > 0).length;
  const onlineRate = totalDevices > 0 ? Math.round((onlineDevices / totalDevices) * 100) : 0;

  return {
    totalGateways,
    activeGateways,
    inactiveGateways: totalGateways - activeGateways,
    totalDevices,
    onlineDevices,
    offlineDevices: totalDevices - onlineDevices,
    onlineRate,
    averageDevicesPerGateway: totalGateways > 0 ? Math.round(totalDevices / totalGateways) : 0
  };
}

// 4. Filtering Functions
export function filterGateways(gateways, filters) {
  return gateways.filter(gateway => {
    // Status filter
    if (filters.status && filters.status !== 'all') {
      if (gateway.status !== filters.status) return false;
    }

    // Location filter (within bounds)
    if (filters.bounds) {
      const lat = parseFloat(gateway.latitude);
      const lng = parseFloat(gateway.longitude);
      if (!isValidCoordinate(lat, lng)) return false;
      
      const { north, south, east, west } = filters.bounds;
      if (lat < south || lat > north || lng < west || lng > east) return false;
    }

    // Owner filter
    if (filters.ownerId && gateway.owned_by !== filters.ownerId) return false;

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableFields = [
        gateway.name,
        gateway.address,
        gateway.owned_by_profile?.business_name
      ].filter(Boolean);
      
      if (!searchableFields.some(field => 
        field.toLowerCase().includes(searchTerm)
      )) return false;
    }

    return true;
  });
}

export function filterDevices(devices, filters) {
  return devices.filter(device => {
    // Status filter
    if (filters.status && filters.status !== 'all') {
      const isOnline = device.motor_status > 0;
      if (filters.status === 'online' && !isOnline) return false;
      if (filters.status === 'offline' && isOnline) return false;
    }

    // Gateway filter
    if (filters.gatewayId && device.gateway_id !== filters.gatewayId) return false;

    // Error status filter
    if (filters.hasErrors !== undefined) {
      const hasErrors = device.error_status > 0;
      if (filters.hasErrors !== hasErrors) return false;
    }

    // Date range filter
    if (filters.lastUpdatedAfter) {
      const lastUpdated = new Date(device.last_updated);
      if (lastUpdated < filters.lastUpdatedAfter) return false;
    }

    // Location filter
    if (filters.bounds) {
      const lat = parseFloat(device.latitude);
      const lng = parseFloat(device.longitude);
      if (!isValidCoordinate(lat, lng)) return false;
      
      const { north, south, east, west } = filters.bounds;
      if (lat < south || lat > north || lng < west || lng > east) return false;
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableFields = [
        device.device_name,
        device.device_id,
        device.user_profile?.full_name,
        device.user_profile?.email,
        device.address
      ].filter(Boolean);
      
      if (!searchableFields.some(field => 
        field.toLowerCase().includes(searchTerm)
      )) return false;
    }

    return true;
  });
}

// 5. Map Utility Functions
export function isValidCoordinate(lat, lng) {
  return !isNaN(lat) && !isNaN(lng) && 
         lat >= -90 && lat <= 90 && 
         lng >= -180 && lng <= 180;
}

export function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 1000; // Return distance in meters
}

export function isDeviceInGatewayRange(device, gateway) {
  if (!isValidCoordinate(device.latitude, device.longitude) ||
      !isValidCoordinate(gateway.latitude, gateway.longitude)) {
    return false;
  }

  const distance = calculateDistance(
    parseFloat(device.latitude),
    parseFloat(device.longitude),
    parseFloat(gateway.latitude),
    parseFloat(gateway.longitude)
  );

  return distance <= (gateway.coverage_radius || 1000);
}

export function getMapBounds(items) {
  const validItems = items.filter(item => 
    isValidCoordinate(item.latitude, item.longitude)
  );

  if (validItems.length === 0) return null;

  const lats = validItems.map(item => parseFloat(item.latitude));
  const lngs = validItems.map(item => parseFloat(item.longitude));

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lngs),
    west: Math.min(...lngs)
  };
}

// 6. Real-time Update Functions
export function subscribeToGatewayUpdates(callback) {
  return supabase
    .channel('gateway-updates')
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'gateways' }, 
        callback
    )
    .subscribe();
}

export function subscribeToDeviceUpdates(callback) {
  return supabase
    .channel('device-updates')
    .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'devices' }, 
        callback
    )
    .subscribe();
}

export function subscribeToGatewayDevices(gatewayId, callback) {
  return supabase
    .channel(`gateway-${gatewayId}-devices`)
    .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'devices',
          filter: `gateway_id=eq.${gatewayId}`
        }, 
        callback
    )
    .subscribe();
}

// 7. Data Update Functions
export async function updateGatewayStatus(gatewayId, status) {
  try {
    const { data, error } = await supabase
      .from('gateways')
      .update({ 
        status, 
        updated_at: new Date().toISOString() 
      })
      .eq('id', gatewayId)
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (err) {
    console.error('Error updating gateway status:', err);
    return { data: null, error: err.message };
  }
}

export async function updateDeviceStatus(deviceId, motorStatus, errorStatus = null) {
  try {
    const updateData = {
      motor_status: motorStatus,
      last_updated: new Date().toISOString()
    };

    if (errorStatus !== null) {
      updateData.error_status = errorStatus;
    }

    const { data, error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', deviceId)
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (err) {
    console.error('Error updating device status:', err);
    return { data: null, error: err.message };
  }
}

export async function updateDeviceLocation(deviceId, latitude, longitude, address = null) {
  try {
    const updateData = {
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      last_updated: new Date().toISOString()
    };

    if (address) {
      updateData.address = address;
    }

    const { data, error } = await supabase
      .from('devices')
      .update(updateData)
      .eq('id', deviceId)
      .select();

    if (error) throw error;
    return { data: data[0], error: null };
  } catch (err) {
    console.error('Error updating device location:', err);
    return { data: null, error: err.message };
  }
}

// 8. Utility Functions for UI
export function formatLastUpdated(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}

export function getStatusColor(status, type = 'gateway') {
  const colors = {
    gateway: {
      active: '#10b981',
      inactive: '#ef4444',
      maintenance: '#f59e0b'
    },
    device: {
      online: '#10b981',
      offline: '#ef4444',
      error: '#f59e0b'
    }
  };

  return colors[type]?.[status] || '#6b7280';
}

export function generateMapPopupContent(item, type) {
  if (type === 'gateway') {
    return `
      <div class="popup-content">
        <h4>${item.name}</h4>
        <p><strong>Status:</strong> ${item.status}</p>
        <p><strong>Devices:</strong> ${item.current_device_count}/${item.max_devices}</p>
        <p><strong>Coverage:</strong> ${item.coverage_radius}m</p>
        ${item.address ? `<p><strong>Address:</strong> ${item.address}</p>` : ''}
        ${item.owned_by_profile ? `<p><strong>Owner:</strong> ${item.owned_by_profile.business_name}</p>` : ''}
      </div>
    `;
  } else if (type === 'device') {
    const isOnline = item.motor_status > 0;
    const hasError = item.error_status > 0;
    
    return `
      <div class="popup-content">
        <h4>${item.device_name || item.device_id}</h4>
        <p><strong>Status:</strong> ${isOnline ? 'Online' : 'Offline'}</p>
        ${hasError ? '<p><strong>⚠️ Error Status:</strong> ' + item.error_status + '</p>' : ''}
        <p><strong>User:</strong> ${item.user_profile?.full_name || 'Unknown'}</p>
        <p><strong>Gateway:</strong> ${item.gateway?.name || 'Unknown'}</p>
        <p><strong>Last Updated:</strong> ${formatLastUpdated(item.last_updated)}</p>
        ${item.address ? `<p><strong>Address:</strong> ${item.address}</p>` : ''}
      </div>
    `;
  }
  
  return '';
}

// 9. Export/Import Functions
export function exportToCSV(data, filename) {
  const headers = Object.keys(data[0] || {});
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// 10. Validation Functions
export function validateGatewayData(gateway) {
  const errors = [];

  if (!gateway.name?.trim()) {
    errors.push('Gateway name is required');
  }

  if (gateway.latitude && !isValidCoordinate(gateway.latitude, gateway.longitude)) {
    errors.push('Invalid coordinates');
  }

  if (gateway.max_devices && gateway.max_devices < 1) {
    errors.push('Max devices must be at least 1');
  }

  if (gateway.coverage_radius && gateway.coverage_radius < 100) {
    errors.push('Coverage radius must be at least 100 meters');
  }

  return errors;
}

export function validateDeviceData(device) {
  const errors = [];

  if (!device.device_id?.trim()) {
    errors.push('Device ID is required');
  }

  if (!device.user_id) {
    errors.push('User assignment is required');
  }

  if (!device.gateway_id) {
    errors.push('Gateway assignment is required');
  }

  if (device.latitude && !isValidCoordinate(device.latitude, device.longitude)) {
    errors.push('Invalid coordinates');
  }

  return errors;
}