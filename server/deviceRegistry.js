/**
 * Device Registry System
 * Unified management for all ranch devices: sensors, cameras, and cattle
 */

const fs = require('fs')
const path = require('path')

class DeviceRegistry {
  constructor(options = {}) {
    this.devices = new Map()
    this.persistenceEnabled = options.persist !== false
    this.storageFile = options.storageFile || path.join(__dirname, 'devices.json')

    if (this.persistenceEnabled && fs.existsSync(this.storageFile)) {
      this.loadFromDisk()
    }
  }

  /**
   * Add a new device to the registry
   */
  addDevice(device) {
    const deviceWithId = {
      ...device,
      id: device.id || this.generateDeviceId(device.type),
      createdAt: device.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      enabled: device.enabled !== false
    }

    // Validate required fields
    if (!deviceWithId.name || !deviceWithId.type) {
      throw new Error('Device must have name and type')
    }

    this.devices.set(deviceWithId.id, deviceWithId)

    if (this.persistenceEnabled) {
      this.saveToDisk()
    }

    return deviceWithId
  }

  /**
   * Get a specific device by ID
   */
  getDevice(id) {
    return this.devices.get(id)
  }

  /**
   * Get all devices, optionally filtered
   */
  getAllDevices(filter = {}) {
    let devices = Array.from(this.devices.values())

    if (filter.type) {
      devices = devices.filter(d => d.type === filter.type)
    }

    if (filter.subtype) {
      devices = devices.filter(d => d.subtype === filter.subtype)
    }

    if (filter.enabled !== undefined) {
      devices = devices.filter(d => d.enabled === filter.enabled)
    }

    return devices
  }

  /**
   * Update an existing device
   */
  updateDevice(id, updates) {
    const device = this.devices.get(id)
    if (!device) {
      throw new Error(`Device not found: ${id}`)
    }

    const updated = {
      ...device,
      ...updates,
      id: device.id, // Prevent ID change
      createdAt: device.createdAt, // Preserve creation timestamp
      updatedAt: new Date().toISOString()
    }

    this.devices.set(id, updated)

    if (this.persistenceEnabled) {
      this.saveToDisk()
    }

    return updated
  }

  /**
   * Delete a device from the registry
   */
  deleteDevice(id) {
    const deleted = this.devices.delete(id)

    if (deleted && this.persistenceEnabled) {
      this.saveToDisk()
    }

    return deleted
  }

  /**
   * Clear all devices (for fresh start)
   */
  clear() {
    this.devices.clear()

    if (this.persistenceEnabled) {
      this.saveToDisk()
    }
  }

  /**
   * Get device count by type
   */
  getDeviceCount(type = null) {
    if (type) {
      return this.getAllDevices({ type }).length
    }
    return this.devices.size
  }

  /**
   * Generate a unique device ID
   */
  generateDeviceId(type) {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substr(2, 9)
    return `${type}-${timestamp}-${random}`
  }

  /**
   * Load devices from disk
   */
  loadFromDisk() {
    try {
      if (fs.existsSync(this.storageFile)) {
        const data = fs.readFileSync(this.storageFile, 'utf-8')
        const devices = JSON.parse(data)

        devices.forEach(device => {
          this.devices.set(device.id, device)
        })

        console.log(`[DeviceRegistry] Loaded ${devices.length} devices from disk`)
      }
    } catch (error) {
      console.error('[DeviceRegistry] Failed to load devices from disk:', error)
    }
  }

  /**
   * Save devices to disk
   */
  saveToDisk() {
    try {
      const devices = Array.from(this.devices.values())
      fs.writeFileSync(this.storageFile, JSON.stringify(devices, null, 2))
    } catch (error) {
      console.error('[DeviceRegistry] Failed to save devices to disk:', error)
    }
  }

  /**
   * Export devices to JSON
   */
  exportToJSON() {
    return Array.from(this.devices.values())
  }

  /**
   * Import devices from JSON
   */
  importFromJSON(devices) {
    devices.forEach(device => {
      this.devices.set(device.id, device)
    })

    if (this.persistenceEnabled) {
      this.saveToDisk()
    }

    return devices.length
  }
}

module.exports = DeviceRegistry
