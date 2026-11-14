// Keep the music showcase calm: only one song plays at a time.
const songs = [...document.querySelectorAll('.maker-audio')];
songs.forEach(song => {
  song.addEventListener('play', () => {
    songs.forEach(other => { if (other !== song) other.pause(); });
  });
});
