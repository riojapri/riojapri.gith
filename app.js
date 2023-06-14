function compressImage() {
    var input = document.getElementById("image-input");
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      var image = new Image();
      image.src = e.target.result;
      image.onload = function() {
        var canvas = document.createElement("canvas");
        var ctx = canvas.getContext("2d");
        canvas.width = image.width;
        canvas.height = image.height;
        ctx.drawImage(image, 0, 0, image.width, image.height);
        var compressedDataUrl = canvas.toDataURL("image/jpeg", 0.5); // Menggunakan kualitas kompresi 0.5 (50%)
        document.getElementById("compressed-image").src = compressedDataUrl;
        document.getElementById("download-image").href = compressedDataUrl;
      };
    };
    reader.readAsDataURL(file);
  }
  
  function compressAudio() {
    var input = document.getElementById("audio-input");
    var file = input.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      var audio = new Audio();
      audio.src = e.target.result;
      var compressedDataUrl = compressAudioDataUrl(audio.src, 128); // Menggunakan bit rate kompresi 128 kbps
      document.getElementById("compressed-audio-source").src = compressedDataUrl;
      document.getElementById("download-audio").href = compressedDataUrl;
      document.getElementById("compressed-audio").load();
    };
    reader.readAsDataURL(file);
  }
  
  function compressAudioDataUrl(dataUrl, bitRate) {
    var audioBlob = base64ToBlob(dataUrl);
    var audioBlobUrl = URL.createObjectURL(audioBlob);
    var audioContext = new (window.AudioContext || window.webkitAudioContext)();
    return new Promise((resolve, reject) => {
      var xhr = new XMLHttpRequest();
      xhr.open("GET", audioBlobUrl, true);
      xhr.responseType = "arraybuffer";
      xhr.onload = function() {
        audioContext.decodeAudioData(xhr.response, function(buffer) {
          var duration = buffer.duration;
          var numChannels = buffer.numberOfChannels;
          var sampleRate = buffer.sampleRate;
          var newBuffer = audioContext.createBuffer(numChannels, duration * bitRate * 1000, sampleRate);
          for (var channel = 0; channel < numChannels; channel++) {
            var inputData = buffer.getChannelData(channel);
            var outputData = newBuffer.getChannelData(channel);
            var inputIndex = 0;
            var outputIndex = 0;
            while (outputIndex < outputData.length) {
              outputData[outputIndex] = inputData[inputIndex];
              inputIndex += Math.round(buffer.sampleRate / bitRate);
              outputIndex++;
            }
          }
          var newAudioBuffer = audioContext.createBufferSource();
          newAudioBuffer.buffer = newBuffer;
          newAudioBuffer.connect(audioContext.destination);
          var destination = audioContext.createMediaStreamDestination();
          newAudioBuffer.connect(destination);
          var newAudioBlob = streamToBlob(destination.stream);
          var newAudioBlobUrl = URL.createObjectURL(newAudioBlob);
          resolve(newAudioBlobUrl);
        });
      };
      xhr.send();
    });
  }
  
  function base64ToBlob(base64Data) {
    var parts = base64Data.split(";base64,");
    var contentType = parts[0].replace("data:", "");
    var byteCharacters = atob(parts[1]);
    var byteArrays = [];
    for (var i = 0; i < byteCharacters.length; i++) {
      byteArrays.push(byteCharacters.charCodeAt(i));
    }
    var byteArray = new Uint8Array(byteArrays);
    return new Blob([byteArray], {type: contentType});
  }
  
  function streamToBlob(stream) {
    return new Promise((resolve, reject) => {
      var blob = new Blob([], {type: "audio/wav"});
      var writer = new WritableStream({
        write(chunk) {
          blob = new Blob([blob, chunk], {type: "audio/wav"});
        },
        close() {
          resolve(blob);
        },
        abort(error) {
          reject(error);
        }
      });
      stream.getAudioTracks()[0].stop();
      var reader = stream.getReader();
      reader.read().then(function processResult(result) {
        if (result.done) {
          writer.close();
          return;
        }
        writer.write(result.value);
        return reader.read().then(processResult);
      }).catch(function(error) {
        writer.abort(error);
      });
    });
  }
  