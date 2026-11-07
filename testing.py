import torch
import librosa
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

# 1. Load the processor and model from Hugging Face
model_id = "facebook/wav2vec2-base-960h"  # fine-tuned for English ASR (xls-r-300m is pretrain-only, no tokenizer)
processor = Wav2Vec2Processor.from_pretrained(model_id)
model = Wav2Vec2ForCTC.from_pretrained(model_id)

# 2. Load and resample your audio file to 16kHz
audio_path = "test.wav"
speech_array, sampling_rate = librosa.load(audio_path, sr=16000)

# 3. Process input values
inputs = processor(
    speech_array, 
    sampling_rate=16000, 
    return_tensors="pt", 
    padding=True
)

# 4. Perform forward pass
with torch.no_grad():
    logits = model(inputs.input_values).logits

# 5. Decode predicted IDs to text
predicted_ids = torch.argmax(logits, dim=-1)
transcription = processor.batch_decode(predicted_ids)

print("Transcription:", transcription[0])
