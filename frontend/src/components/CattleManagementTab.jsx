import { useState, useEffect } from 'react'

function CattleManagementTab() {
  const [cattle, setCattle] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [earTag, setEarTag] = useState('')
  const [name, setName] = useState('')
  const [breed, setBreed] = useState('Angus')
  const [weight, setWeight] = useState('')
  const [pasture, setPasture] = useState('')

  // Fetch all cattle
  const fetchCattle = async () => {
    try {
      const response = await fetch('/api/admin/cattle')
      if (response.ok) {
        const data = await response.json()
        setCattle(data.cattle || [])
      }
    } catch (err) {
      console.error('Failed to fetch cattle:', err)
    }
  }

  useEffect(() => {
    fetchCattle()
  }, [])

  const handleAddCattle = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    try {
      const response = await fetch('/api/admin/cattle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          earTag,
          name: name || earTag,
          breed,
          weight: weight ? Number(weight) : null,
          pasture
        })
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to add cattle')
      }

      setSuccess(`Cattle "${earTag}" added successfully`)

      // Reset form
      setEarTag('')
      setName('')
      setBreed('Angus')
      setWeight('')
      setPasture('')

      // Refresh list
      fetchCattle()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCattle = async (earTagToDelete) => {
    if (!confirm(`Are you sure you want to remove cattle "${earTagToDelete}"?`)) {
      return
    }

    setError('')
    setSuccess('')

    try {
      const response = await fetch(`/api/admin/cattle/${encodeURIComponent(earTagToDelete)}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete cattle')
      }

      setSuccess(`Cattle "${earTagToDelete}" removed successfully`)
      fetchCattle()
    } catch (err) {
      setError(err.message)
    }
  }

  const commonBreeds = [
    'Angus',
    'Hereford',
    'Charolais',
    'Simmental',
    'Brahman',
    'Longhorn',
    'Holstein',
    'Jersey',
    'Limousin',
    'Gelbvieh',
    'Mixed/Crossbred',
    'Other'
  ]

  return (
    <div className="admin-section">
      <div className="admin-form-section">
        <h3 className="admin-section-title">Add New Cattle</h3>
        <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
          Register individual cattle by ear tag ID. Each animal will be tracked in the system.
        </p>

        {error && (
          <div className="admin-alert admin-alert-error" style={{ marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {success && (
          <div className="admin-alert admin-alert-success" style={{ marginBottom: '1rem' }}>
            {success}
          </div>
        )}

        <form onSubmit={handleAddCattle} className="admin-form">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--spacing-md)' }}>
            <div className="admin-form-group">
              <label htmlFor="earTag">Ear Tag ID *</label>
              <input
                type="text"
                id="earTag"
                value={earTag}
                onChange={(e) => setEarTag(e.target.value)}
                placeholder="e.g., 3S-001"
                required
                className="admin-input"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="name">Name (optional)</label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Bessie"
                className="admin-input"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="breed">Breed</label>
              <select
                id="breed"
                value={breed}
                onChange={(e) => setBreed(e.target.value)}
                className="admin-input"
              >
                {commonBreeds.map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>

            <div className="admin-form-group">
              <label htmlFor="weight">Weight (lbs)</label>
              <input
                type="number"
                id="weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g., 1200"
                min="0"
                className="admin-input"
              />
            </div>

            <div className="admin-form-group">
              <label htmlFor="pasture">Pasture</label>
              <input
                type="text"
                id="pasture"
                value={pasture}
                onChange={(e) => setPasture(e.target.value)}
                placeholder="e.g., North Pasture"
                className="admin-input"
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ marginTop: '1rem' }}>
            {loading ? 'Adding...' : 'Add Cattle'}
          </button>
        </form>
      </div>

      <div className="admin-users-section">
        <h3 className="admin-section-title">Registered Cattle ({cattle.length})</h3>
        <div className="admin-users-list">
          {cattle.length === 0 ? (
            <div className="admin-empty-state">
              No cattle registered yet. Add your first animal above to begin tracking.
            </div>
          ) : (
            cattle.map(animal => (
              <div key={animal.id} className="admin-user-card">
                <div className="admin-user-info">
                  <div className="admin-user-name">
                    {animal.name} {animal.earTag !== animal.name && `(${animal.earTag})`}
                  </div>
                  <div className="admin-user-date">
                    {animal.breed}
                    {animal.weight && ` • ${animal.weight} lbs`}
                    {animal.pasture && ` • ${animal.pasture}`}
                  </div>
                  {animal.lat && animal.lon && (
                    <div className="admin-user-date" style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      Last location: {animal.lat.toFixed(5)}, {animal.lon.toFixed(5)}
                    </div>
                  )}
                </div>
                <button
                  className="btn btn-danger-small"
                  onClick={() => handleDeleteCattle(animal.earTag)}
                >
                  Remove
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {cattle.length > 0 && (
        <div className="admin-info-box" style={{ marginTop: '1.5rem' }}>
          <p>
            <strong>Tip:</strong> Cattle locations will be updated automatically when GPS ear tags transmit data.
            Use the simulator to test movement patterns and location tracking.
          </p>
        </div>
      )}
    </div>
  )
}

export default CattleManagementTab
