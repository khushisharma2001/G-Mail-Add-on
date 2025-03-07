# Falcon Email Assistant

## Overview
The **Falcon Email Assistant** is a Gmail add-on powered by the Falcon-7B-Instruct model. It helps users manage emails efficiently by summarizing, categorizing, and generating replies with AI.

## Features
- **Email Summarization:** Extracts key details (sender, subject, date) and generates concise summaries.
- **Email Classification & Labeling:** Automatically sorts emails by sender domain and applies labels.
- **AI-Powered Reply Generation:** Suggests responses with customizable subject lines.
- **User-Friendly Interface:** Designed using Google Apps Script's Card Service for easy navigation.
- **Secure API Integration:** Uses Hugging Face API to process email content securely.

## Installation & Setup
1. Clone this repository:
   ```sh
   git clone https://github.com/yourusername/Falcon-Email-Assistant.git
   ```
2. Open Google Apps Script and upload `code.gs` and `appscript.json`.
3. Deploy as a Google Workspace Add-on.
4. Grant necessary permissions for Gmail integration.

## Technologies Used
- **Natural Language Processing:** Falcon-7B-Instruct (Hugging Face)
- **Google Apps Script** for Gmail Add-on Development
- **API Integration** for AI model access

## Learnings
This project demonstrates how AI can streamline email management. Key takeaways include:
- Efficient NLP model integration for automation
- Optimized UI/UX for add-on interaction
- Secure handling of email content

## License
This project is licensed under the MIT License - see the LICENSE file for details.
