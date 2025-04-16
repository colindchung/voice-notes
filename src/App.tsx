import { useState, useRef } from 'react';
import './App.css';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

/* TODOS:
- Add a button to copy the formatted note
- Store transcript and vector embeddings in supa
- Allow record for a different date
- Add a button to copy the formatted note
- Fetch terminology from supa
*/

const terminology = `- Byterat (pronounced "byte-rat"): The company I work for which provides AI and a data pipeline to battery science labs
  - The team consists of Penny (CEO), Paul (CTO), Doel (Front end lead), Nawar (Data lead), and myself (Full stack lead)
- Ohm AI: The LLM integration that I am building for Byterat
- Jupyter Notebooks: The notebooks that I use to build the LLM integration
- JupyterLab: The UI for the Jupyter Notebooks (single user instance)
- JupyterHub: The service that I am using to host the Jupyter Notebooks
- Node: A single operation in the AI workflow
- Sync Agent: Agent installed on our customer's machines to send data into our cloud
- Enpower: Customer
- Li-S: Customer
- Indiana BIC: Customer (also referred to as just BIC)
- Arbin, Neware, Biologic, Bitrode, Maccor: Brands of cyclers that our customers use
- BDF: Battery Data Format
- DAG: Directed Acyclic Graph - used by Ohm AI
- Lovable, Bolt, Replit, Cursor: AI tools we use in daily workflow
- Prisma: ORM that I use to interact with the database
- React, Vite, Tailwind, Mantine, Framer: UI libraries
- Vercel, pgvector, Opensearch, Timescale, GraphQL, Mage: Backend third party services
- S3, SQS, SNS, EC2, ECR, Lambda, API Gateway: AWS services
`;

function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcript, setTranscript] = useState('');
  const [formattedNote, setFormattedNote] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    audioChunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        setAudioBlob(audioBlob);

        // Transcribe audio
        transcribeAudio(audioBlob);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);

      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.wav');
      formData.append('model', 'whisper-1');

      // TODO: can i feed in terminology at this level
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: formData,
      });

      const data = await response.json();
      setTranscript(data.text);
    } catch (error) {
      console.error('Error transcribing audio:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const formatToMarkdown = async () => {
    if (!transcript) return;

    setIsLoading(true);

    const todayDate = new Date().toISOString().split('T')[0];
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that formats spoken notes into well-structured markdown. 
              Format the text with appropriate headers, bullet points, and other markdown elements.

              The first header should be ${todayDate} in YYYY-MM-DD format as a H2 header.
              Separate each section of today's notes with a H3 header.
              
              Custom terminology and context:
              ${terminology}
              
              When correcting the user's raw transcription with the terminology, do not explain the correction, just return the corrected text.
              `,
            },
            {
              role: 'user',
              content: transcript,
            },
          ],
        }),
      });

      const data = await response.json();
      const formattedText = data.choices[0].message.content;

      setFormattedNote(formattedText);
    } catch (error) {
      console.error('Error formatting to markdown:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
    setFormattedNote('');
  };

  return (
    <main className="flex h-full w-full flex-col bg-gray-900 p-8 text-white">
      <h1 className="mb-8 text-3xl font-bold text-white underline">Voice Notes</h1>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col space-y-4">
          <div className="rounded-lg bg-gray-800 p-4">
            <h2 className="mb-4 text-xl font-semibold">Record Your Day</h2>

            <div className="flex flex-col items-center space-y-4">
              <div
                className={`flex h-32 w-32 items-center justify-center rounded-full ${isRecording ? 'animate-pulse bg-red-500' : 'bg-gray-700'}`}
              >
                <button
                  onClick={isRecording ? stopRecording : startRecording}
                  className="flex h-full w-full cursor-pointer items-center justify-center rounded-full focus:outline-none"
                >
                  {isRecording ? (
                    <span className="text-lg text-white">Stop</span>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-12 w-12 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                      />
                    </svg>
                  )}
                </button>
              </div>

              {audioBlob && (
                <audio controls src={URL.createObjectURL(audioBlob)} className="w-full" />
              )}
            </div>
          </div>

          <div className="rounded-lg bg-gray-800 p-4">
            <h2 className="mb-2 text-xl font-semibold">Transcript</h2>
            {/* TODO, allow editing before sending to summarizer */}
            <div className="max-h-[300px] min-h-[150px] overflow-y-auto rounded bg-gray-700 p-3">
              {isLoading && !transcript ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-white"></div>
                </div>
              ) : (
                transcript || 'Your transcript will appear here...'
              )}
            </div>
            <div className="flex flex-row space-x-2">
              <button
                onClick={clearTranscript}
                className="mt-4 w-full rounded-md bg-gray-600 px-4 py-2 hover:bg-gray-700 disabled:bg-gray-600"
              >
                Clear Transcript
              </button>
              <button
                onClick={formatToMarkdown}
                disabled={!transcript || isLoading}
                className="mt-4 w-full rounded-md bg-green-600 px-4 py-2 hover:bg-blue-700 disabled:bg-gray-600"
              >
                {isLoading ? 'Processing...' : 'Format to Markdown'}
              </button>
            </div>
          </div>

          <div className="rounded-lg bg-gray-800 p-4">
            <h2 className="mb-2 text-xl font-semibold">Custom Terminology</h2>
            <textarea
              value={terminology}
              placeholder="Define your custom terms here. For example:&#10;JIRA - Our project management tool&#10;OKRs - Objectives and Key Results&#10;..."
              className="min-h-[150px] w-full rounded bg-gray-700 p-3 text-white"
            />
          </div>
        </div>

        <div className="flex flex-col space-y-4">
          <div className="flex-grow rounded-lg bg-gray-800 p-4">
            <h2 className="mb-2 text-xl font-semibold">Formatted Note</h2>
            <div className="markdown-content max-h-[600px] min-h-[150px] overflow-y-auto rounded bg-gray-700 p-3">
              {isLoading && !formattedNote ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-8 w-8 animate-spin rounded-full border-t-2 border-b-2 border-white"></div>
                </div>
              ) : (
                <pre className="whitespace-pre-wrap">
                  {/* TODO: add copy text button */}
                  {formattedNote || 'Your formatted note will appear here...'}
                </pre>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export default App;
