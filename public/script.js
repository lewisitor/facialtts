document.getElementById('videoForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = document.getElementById('inputText').value.trim();
  if (!text) return;

  const resultDiv = document.getElementById('result');
  resultDiv.innerHTML = `<p class="text-gray-700">Generating video...</p>`;

  try {
    const response = await fetch(`/generateVideo?text=${encodeURIComponent(text)}`);
    const data = await response.json();
    if (data.error) {
      resultDiv.innerHTML = `<p class="text-red-500">Error: ${data.error}</p>`;
    } else if (data.videoUrl) {
      resultDiv.innerHTML = `
        <video controls autoplay class="w-full mt-4">
          <source src="${data.videoUrl}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      `;
    } else {
      resultDiv.innerHTML = `<p class="text-red-500">Unexpected response from server.</p>`;
    }
  } catch (err) {
    resultDiv.innerHTML = `<p class="text-red-500">Error generating video.</p>`;
    console.error(err);
  }
});


// Add to form submission handler
form.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Get selected method
  const generationMethod = document.querySelector('input[name="generationMethod"]:checked').value;

  // Add to your existing form data
  const formData = {
    avatarPath: selectedAvatar,
    audioPath: audioData.path,
    method: generationMethod
  };

  try {
    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    
    if (data.success) {
      showResult(data.videoUrl, data.metadata);
    } else {
      showError(data.error);
    }
  } catch (error) {
    showError(error.message);
  }
});

// Updated showResult function
function showResult(videoUrl, metadata) {
  resultContent.innerHTML = `
    <div class="space-y-4">
      <div class="aspect-video bg-black rounded-lg overflow-hidden">
        <video controls autoplay loop class="w-full h-full">
          <source src="${videoUrl}" type="video/mp4">
        </video>
      </div>
      <div class="bg-indigo-50 p-4 rounded-lg">
        <p class="text-sm text-indigo-800">
          Generated with ${metadata.provider} 
          ${metadata.processingTime ? `in ${metadata.processingTime}s` : ''}
        </p>
      </div>
      <div class="grid grid-cols-2 gap-4">
        <a href="${videoUrl}" download class="btn-primary">
          <i class="fas fa-download mr-2"></i> Download
        </a>
        <button onclick="resetForm()" class="btn-secondary">
          <i class="fas fa-redo mr-2"></i> New Video
        </button>
      </div>
    </div>
  `;
}