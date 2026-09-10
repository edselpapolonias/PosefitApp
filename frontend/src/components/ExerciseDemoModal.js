import React, { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './ExerciseDemoModal.css';

export default function ExerciseDemoModal({ exerciseName, videoSrc, onClose }) {
  const dialogRef = useRef(null);
  const videoRef = useRef(null);
  const titleId = useId();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);

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
      // Autoplay may be blocked; the silent Play button remains available.
    });
    return () => {
      video.pause();
      video.currentTime = 0;
      dialog.close();
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (video.paused) video.play()?.catch(() => setPlaying(false));
    else video.pause();
  };

  return createPortal(
    <dialog
      ref={dialogRef}
      className="exercise-demo"
      aria-labelledby={titleId}
      aria-modal="true"
      onCancel={(event) => { event.preventDefault(); onClose(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div className="exercise-demo__panel">
        <header>
          <div><span>EXERCISE DEMONSTRATION</span><h2 id={titleId}>How to Perform: {exerciseName}</h2></div>
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
            onLoadedMetadata={(event) => setDuration(Number.isFinite(event.currentTarget.duration) ? event.currentTarget.duration : 0)}
            onLoadedData={() => setLoading(false)}
            onPlaying={() => { setPlaying(true); setLoading(false); }}
            onPause={() => setPlaying(false)}
            onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
            onError={() => { setError(true); setLoading(false); }}
          />
          {(loading || error) && <p className="exercise-demo__status" role={error ? 'alert' : 'status'}>{error ? 'Unable to load the demonstration video.' : 'Loading demonstration…'}</p>}
        </div>
        {!error && <div className="exercise-demo__controls">
          <button type="button" onClick={togglePlayback} aria-label={playing ? 'Pause demonstration' : 'Play demonstration'}><i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} aria-hidden="true" />{playing ? 'Pause' : 'Play'}</button>
          <input type="range" min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} disabled={!duration} aria-label="Demonstration playback position" onChange={(event) => { const time = Number(event.target.value); videoRef.current.currentTime = time; setPosition(time); }} />
          <button type="button" aria-label="Restart demonstration" onClick={() => { videoRef.current.currentTime = 0; setPosition(0); videoRef.current.play()?.catch(() => setPlaying(false)); }}><i className="fa-solid fa-rotate-left" aria-hidden="true" /><span>Restart</span></button>
        </div>}
        <p className="exercise-demo__note">Silent demonstration · Repeats automatically</p>
      </div>
    </dialog>,
    document.body,
  );
}
