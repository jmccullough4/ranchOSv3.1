function CamerasPanel({ cameras, onOpenCamera, collapsed, onToggle }) {
  const onlineCount = cameras.filter((cam) => cam.status === 'online').length

  return (
    <section className={`details-card ${collapsed ? 'collapsed' : ''}`}>
      <div className="card-header-action">
        <h2>
          <button type="button" className="details-toggle" onClick={onToggle} aria-expanded={!collapsed}>
            Security &amp; Predator Watch
            <span className="toggle-icon" aria-hidden="true" />
          </button>
        </h2>
        <span className="badge subtle">
          {onlineCount}/{cameras.length} online
        </span>
      </div>
      {!collapsed && (
        <div className="camera-grid">
          {cameras.map((feed) => {
            const isOnline = feed.status === 'online'
            return (
              <div key={feed.camera} className={`camera-tile ${feed.status}`}>
                <div className="camera-header">
                  <div className="camera-id-block">
                    <span className="camera-id">{feed.camera.toUpperCase()}</span>
                    <span className="camera-location">{feed.name || feed.location}</span>
                  </div>
                  <span className={`camera-status ${feed.status}`}>{feed.status}</span>
                </div>
                <div className="camera-body">
                  {isOnline && feed.embedUrl ? (
                    <button
                      type="button"
                      className="camera-thumbnail"
                      onClick={() => onOpenCamera?.(feed)}
                      aria-label={`View ${feed.camera} live stream`}
                    >
                      <div className="camera-preview-placeholder">
                        <span className="camera-thumbnail-icon">▶</span>
                      </div>
                      <span className="camera-thumbnail-overlay">
                        <span className="camera-thumbnail-copy">Expand live view</span>
                      </span>
                    </button>
                  ) : (
                    <div className="camera-offline">Feed unavailable</div>
                  )}
                </div>
                <div className="camera-footer">
                  <span className="camera-location">{feed.location || feed.name}</span>
                  {feed.predator_detected || feed.aiDetection?.alertLevel === 'high' || feed.aiDetection?.alertLevel === 'critical' ? (
                    <span className="predator-alert">
                      {feed.aiDetection?.detections?.[0]?.object
                        ? `${feed.aiDetection.detections[0].object} detected`
                        : 'Predator detected'}
                    </span>
                  ) : (
                    <span className="predator-clear">Clear</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

export default CamerasPanel
