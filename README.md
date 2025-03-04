
# Interview Copilot 🚀
## [aicopilot.chat](https://aicopilot.chat/)

An AI-powered interview assistant that provides real-time transcription and intelligent responses during technical interviews, now supporting both OpenAI and Gemini models.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![React](https://img.shields.io/badge/React-18.2.0-blue)
![Redux](https://img.shields.io/badge/Redux-4.2.1-purple)

## Features ✨

- 🎙️ Real-time voice transcription for both interviewer and candidate
- 🤖 AI-powered responses with conversation context awareness, powered by configurable AI models (OpenAI or Gemini)
- 💻 Code formatting and syntax highlighting
- ⏱️ Configurable automatic silence detection for question submission
- 📚 Question history with combined query capability
- ⚙️ Configurable settings for AI models, API keys, response length, and system prompts
- 🔄 Support for various Gemini models, including experimental and thinking versions
- 📏 Configurable response length (concise, medium, lengthy)

## Technologies Used 🛠️

- **Frontend**: React, Redux, Material-UI
- **AI Services**: OpenAI GPT, Google Gemini, Azure Cognitive Services (Speech)
- **Build Tools**: npm
- **Other Libraries**: React Markdown, Highlight.js

## Getting Started 🚀

### Prerequisites

- Node.js (v18+)
- npm (v9+)
- OpenAI API key: get your OpenAI key [OpenAI key](https://platform.openai.com/docs/overview)
- Gemini API key: get your Gemini key from Google AI Studio. [Get a free gemini api key here](https://aistudio.google.com/app/apikey)
- Azure Speech Service subscription key: You can get a key with a free trial [Get your Azure key](https://azure.microsoft.com/en-us/pricing/purchase-options/azure-account)

### Installation

1. **Clone the repository**
   ```bash
   git clone [https://github.com/hariiprasad/interviewcopilot.git](https://github.com/hariiprasad/interviewcopilot.git)
   cd interviewcopilot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```

4. **Access the application**
   ```
   http://localhost:3000
   ```

## Configuration ⚙️

1. Open the Settings dialog (⚙️ icon in header)
2. Enter your API credentials:
   - OpenAI API Key (if using OpenAI models)
   - Gemini API Key (if using Gemini models)
   - Azure Speech Service Key
   - Azure Region
3. Configure preferences:
   - AI Model (OpenAI or Gemini models)
   - System Prompt
   - Auto-Ask mode
   - Manual Mode
   - Response length (concise, medium, lengthy)
   - Silence Timer Duration

## Usage 🖥️

### Main Interface Components

1. **System Audio Panel (Left)**
   - Start/Stop system audio capture
   - View/edit interviewer questions
   - Question history management

2. **Response Panel (Center)**
   - Real-time AI responses
   - Code formatting and syntax highlighting
   - Previous response history
   - Auto-scroll toggle

3. **Microphone Panel (Right)**
   - Start/Stop candidate audio capture
   - Manual mode toggle
   - Candidate response submission

### Key Features

- **Auto-Ask Mode**: Automatically submit questions after a configurable period of silence.
- **Manual Mode**: Type and submit candidate responses manually.
- **Combine Questions**: Select multiple questions from history for combined analysis.
- **Real-time Transcription**: Simultaneous speaker recognition and transcription.
- **Configurable AI Models**: Choose between OpenAI and various Gemini models.
- **Response Length Control**: Tailor the length of AI-generated responses.

## Troubleshooting 🛠️

**Common Issues:**

1. **Audio Permissions**
   - Ensure browser has microphone access
   - Refresh page if permissions are denied

2. **API Errors**
   - Verify API keys in settings
   - Check network connectivity
   - Ensure proper Azure region configuration
   - Ensure correct API key is provided for the selected AI model

3. **Transcription Issues**
   - Speak clearly with minimal background noise
   - Verify Azure Speech Service subscription

## Contributing 🤝

We welcome contributions! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

- OpenAI for their GPT models
- Google for their Gemini models
- Microsoft Azure Cognitive Services
- Material-UI team for UI components
- React community for awesome tools
