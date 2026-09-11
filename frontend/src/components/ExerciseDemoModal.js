import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ExerciseDemoModal.css';

export default function ExerciseDemoModal({ exerciseName, videoSrc, onClose }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const titleId = useId();
  const [loading, setLoading] = useState(true);
  const [videoRatio, setVideoRatio] = useState(16 / 9);
  const [error, setError] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const video = videoRef.current;
    const trigger = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    dialog.querySelector('button').focus();
    video.defaultMuted = true;
    video.muted = true;
    video.volume = 0;
    video.play()?.catch(() => {
      // Keep a blocked autoplay request from producing an unhandled rejection.
    });
    return () => {
      video.pause();
      video.currentTime = 0;
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  return createPortal(
    <dialog
      ref={dialogRef}
      className="exercise-demo"
      style={{ '--demo-video-ratio': videoRatio }}
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="exercise-demo__panel">
        <header>
          <h2 id={titleId}>EXERCISE DEMONSTRATION</h2>
          <button type="button" className="exercise-demo__close" aria-label="Close demonstration video" onClick={onClose}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
        </header>
        <div className="exercise-demo__player" aria-busy={loading && !error}>
          <video
            ref={videoRef}
            src={videoSrc}
            aria-label={`${exerciseName} demonstration video`}
            muted autoPlay loop playsInline preload="metadata"
            disablePictureInPicture disableRemotePlayback
            onVolumeChange={(event) => { event.currentTarget.muted = true; if (event.currentTarget.volume !== 0) event.currentTarget.volume = 0; }}
            onLoadedMetadata={(event) => {
              const { videoWidth, videoHeight } = event.currentTarget;
              if (videoWidth > 0 && videoHeight > 0) setVideoRatio(videoWidth / videoHeight);
            }}
            onLoadedData={() => setLoading(false)}
            onPlaying={() => setLoading(false)}
            onError={() => { setError(true); setLoading(false); }}
          />
          {(loading || error) && <p className="exercise-demo__status" role={error ? 'alert' : 'status'}>{error ? 'Unable to load the demonstration video.' : 'Loading demonstration…'}</p>}
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
