fetch('/header.html')
  .then(response => response.text())
  .then(data => {
    document.getElementById('header-placeholder').innerHTML = data;
  })
  .catch(error => console.error('Error loading header:', error));

  // I don't understand JS, this was from AI