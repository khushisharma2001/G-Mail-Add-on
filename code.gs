var FALCON_API_URL = "YOUR_MODEL";
var FALCON_API_TOKEN = "YOUR_HUGGINGFACE_API_TOKEN";

// Entry point for the homepage
function onHomepage(e) {
  var card = createActionPage();
  return card.build();
}

// Handler for opening an email
function onGmailMessageOpen(e) {
  var card = createActionPage();
  return card.build();
}

// Function to create the action page
function createActionPage() {
  var card = CardService.newCardBuilder();
  card.addSection(CardService.newCardSection()
    .addWidget(CardService.newTextParagraph().setText("<b>Welcome to Falcon Email Assistant!</b> Select an action below:"))
    .addWidget(CardService.newTextButton()
      .setText("Get Email Summary")
      .setOnClickAction(CardService.newAction()
        .setFunctionName("onGetEmailSummaryClicked"))
      .setBackgroundColor("#4285F4"))  // Blue color
    .addWidget(CardService.newTextButton()
      .setText("Reply with New Subject")
      .setOnClickAction(CardService.newAction()
        .setFunctionName("onGmailMessageReply"))
      .setBackgroundColor("#34A853"))  // Green color
    .addWidget(CardService.newTextButton()
      .setText("Customize Email")
      .setOnClickAction(CardService.newAction()
        .setFunctionName("onCustomizeEmails"))
      .setBackgroundColor("#EA4335")));  // Yellow color
  return card;
}

// Handler for the "Get Email Summary" button
function onGetEmailSummaryClicked(e) {
  var messageId = getMessageId(e);
  if (!messageId) {
    return createErrorCard("Error: No email selected.");
  }
  var message = GmailApp.getMessageById(messageId);
  var emailBody = message.getBody();
  var plainText = stripHtml(emailBody);
  if (plainText) {
    var sender = extractSender(message);
    var subject = extractSubject(message);
    var date = extractDate(message);
    var summary = summarizeText(plainText);
    var card = CardService.newCardBuilder()
      .addSection(CardService.newCardSection()
        .addWidget(CardService.newTextParagraph().setText("<b>Sender:</b> " + sender))
        .addWidget(CardService.newTextParagraph().setText("<b>Subject:</b> " + subject))
        .addWidget(CardService.newTextParagraph().setText("<b>Date:</b> " + date))
        .addWidget(CardService.newTextParagraph().setText("<b>Summary:</b>\n" + summary)));
    return card.build();
  } else {
    return createErrorCard("Error: Could not fetch email content.");
  }
}

// Handler for the "Reply with New Subject" button
function onGmailMessageReply(e) {
  var messageId = getMessageId(e);
  if (!messageId) {
    return createErrorCard("Error: No email selected.");
  }
  var card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextInput()
        .setFieldName("newSubject")
        .setTitle("New Subject"))
      .addWidget(CardService.newTextInput()
        .setFieldName("prompt")
        .setTitle("Prompt for Reply")
        .setMultiline(true))
      .addWidget(CardService.newTextButton()
        .setText("Generate Reply")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onSubmitNewSubjectAndReply")
          .setParameters({ "messageId": messageId }))
        .setBackgroundColor("#EA4335")));  // Red color
  return card.build();
}

// Handler for the "Customize Email" button
function onCustomizeEmails(e) {
  var card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextInput()
        .setFieldName("labelCategory")
        .setTitle("Label Category")
        .setHint("Enter the category to filter emails"))
      .addWidget(CardService.newTextInput()
        .setFieldName("labelName")
        .setTitle("Label Name")
        .setHint("Enter the name for the new label"))
      .addWidget(CardService.newTextButton()
        .setText("Categorize Emails")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onCategorizeEmails"))
        .setBackgroundColor("#34A853")));  // Green color
  return card.build();
}

function onCategorizeEmails(e) {
  var commonEventObject = e.commonEventObject;
  var formInputs = commonEventObject.formInputs;

  var labelCategory = formInputs.labelCategory.stringInputs.value[0];
  var labelName = formInputs.labelName.stringInputs.value[0];

  if (!labelCategory || !labelName) {
    return createErrorCard("Error: Please provide both a label category and label name.");
  }

  var now = new Date();
  var lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());

  var threads = GmailApp.search('after:' + formatDate(lastMonth) + ' ' + labelCategory);
  for (var i = 0; i < threads.length; i++) {
    var thread = threads[i];
    var label = getOrCreateLabel(labelName);
    thread.addLabel(label);
  }

  var card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("<b>Emails have been successfully classified.</b>")));
  return card.build();
}

// Utility functions
function createErrorCard(errorMessage) {
  var errorCard = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("<b>" + errorMessage + "</b>")));
  return errorCard.build();
}

function stripHtml(html) {
  html = html.replace(/<style([\s\S]*?)<\/style>/gi, '');
  html = html.replace(/@media[\s\S]*?\}/gi, '');
  html = html.replace(/@font-face[\s\S]*?\}/gi, '');
  html = html.replace(/:root([\s\S]*?)\}/gi, '');
  html = html.replace(/<[^>]+>/g, '');
  html = html.replace(/\s+/g, ' ').trim();
  return html;
}

function extractSender(message) {
  var sender = message.getFrom();
  return sender ? sender : "Unknown Sender";
}

function extractSubject(message) {
  var subject = message.getSubject();
  return subject ? subject : "Unknown Subject";
}

function extractDate(message) {
  var date = message.getDate();
  return date ? date.toDateString() : "Unknown Date";
}

function summarizeText(text) {
  var prompt = "Please summarize the following email into key points and main information only. Do not include the original content, just the summary:\n\n" + text + "\n\nSummary:";
  var payload = {
    "inputs": prompt,
    "parameters": {
      "max_length": 8000,
      "do_sample": false
    }
  };
  var options = {
    "method": "POST",
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer " + FALCON_API_TOKEN
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  try {
    var response = UrlFetchApp.fetch(FALCON_API_URL, options);
    var data = JSON.parse(response.getContentText());
    if (data && data.length > 0 && data[0].generated_text) {
      return cleanSummary(data[0].generated_text);
    } else if (data && data.error) {
      return "Error from Falcon API: " + data.error;
    } else {
      return "No summary available.";
    }
  } catch (e) {
    return "Error fetching summary.";
  }
}

function cleanSummary(summary) {
  var splitSummary = summary.split("Summary:");
  if (splitSummary.length > 1) {
    return splitSummary[splitSummary.length - 1].trim();
  }
  return summary;
}

function extractDomain(emailAddress) {
  var atIndex = emailAddress.indexOf("@");
  if (atIndex === -1) {
    return "Uncategorized";
  }
  var domain = emailAddress.substring(atIndex + 1).toLowerCase();
  var parts = domain.split('.');
  if (parts.length > 2) {
    parts = parts.slice(1);
  }
  var coreDomain = parts.slice(0, -1).join(' ');
  return coreDomain.charAt(0).toUpperCase() + coreDomain.slice(1);
}

function getOrCreateLabel(labelName) {
  var sanitizedLabelName = sanitizeLabelName(labelName);
  var label = GmailApp.getUserLabelByName(sanitizedLabelName);
  if (!label) {
    label = GmailApp.createLabel(sanitizedLabelName);
  }
  return label;
}

function sanitizeLabelName(labelName) {
  return labelName.replace(/[^\w\s-]/g, '').substring(0, 100).trim();
}

function onSubmitNewSubjectAndReply(e) {
  var commonEventObject = e.commonEventObject;
  if (!commonEventObject) {
    return createErrorCard("Error: commonEventObject is undefined.");
  }
  var parameters = commonEventObject.parameters;
  var formInputs = commonEventObject.formInputs;
  if (!parameters || !parameters.messageId) {
    return createErrorCard("Error: Message ID is undefined.");
  }
  if (!formInputs || !formInputs.newSubject || !formInputs.newSubject.stringInputs || !formInputs.newSubject.stringInputs.value || !formInputs.prompt || !formInputs.prompt.stringInputs || !formInputs.prompt.stringInputs.value) {
    return createErrorCard("Error: Missing new subject or prompt for reply.");
  }
  var messageId = parameters.messageId;
  var newSubject = formInputs.newSubject.stringInputs.value[0];
  var prompt = formInputs.prompt.stringInputs.value[0];

  var generatedReply = getGeneratedReplyFromFalcon(prompt);

  var card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("<b>Generated Reply:</b>"))
      .addWidget(CardService.newTextParagraph().setText(generatedReply))
      .addWidget(CardService.newTextButton()
        .setText("Edit Reply")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onEditReply")
          .setParameters({
            messageId: messageId,
            newSubject: newSubject,
            generatedReply: generatedReply
          }))
        .setBackgroundColor("#4285F4"))) // Blue color
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText("Send Reply")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onSendReply")
          .setParameters({
            messageId: messageId,
            newSubject: newSubject,
            generatedReply: generatedReply
          }))
        .setBackgroundColor("#34A853"))); // Green color
  return card.build();
}

function onEditReply(e) {
  var parameters = e.parameters;
  if (!parameters || !parameters.messageId || !parameters.newSubject || !parameters.generatedReply) {
    return createErrorCard("Error: Missing parameters for editing reply.");
  }
  var messageId = parameters.messageId;
  var newSubject = parameters.newSubject;
  var generatedReply = parameters.generatedReply;

  var card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextInput()
        .setFieldName("generatedReply")
        .setTitle("Edit Reply")
        .setHint("Press Enter for a new line")
        .setMultiline(true)
        .setValue(generatedReply))
      .addWidget(CardService.newTextButton()
        .setText("Save Reply")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onSaveReply")
          .setParameters({
            messageId: messageId,
            newSubject: newSubject
          }))
        .setBackgroundColor("#FBBC05"))); // Yellow color

  return card.build();
}

function onSaveReply(e) {
  var commonEventObject = e.commonEventObject;
  if (!commonEventObject) {
    return createErrorCard("Error: commonEventObject is undefined.");
  }
  var parameters = commonEventObject.parameters;
  var formInputs = commonEventObject.formInputs;
  if (!parameters || !parameters.messageId || !parameters.newSubject) {
    return createErrorCard("Error: Missing parameters for saving reply.");
  }
  var messageId = parameters.messageId;
  var newSubject = parameters.newSubject;
  var generatedReply = formInputs.generatedReply.stringInputs.value[0];

  var card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("<b>Generated Reply:</b>"))
      .addWidget(CardService.newTextParagraph().setText(generatedReply))
      .addWidget(CardService.newTextButton()
        .setText("Edit Reply")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onEditReply")
          .setParameters({
            messageId: messageId,
            newSubject: newSubject,
            generatedReply: generatedReply
          }))
        .setBackgroundColor("#4285F4"))) // Blue color
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextButton()
        .setText("Send Reply")
        .setOnClickAction(CardService.newAction()
          .setFunctionName("onSendReply")
          .setParameters({
            messageId: messageId,
            newSubject: newSubject,
            generatedReply: generatedReply
          }))
        .setBackgroundColor("#34A853"))); // Green color
  return card.build();
}

function onSendReply(e) {
  var commonEventObject = e.commonEventObject;
  if (!commonEventObject) {
    return createErrorCard("Error: commonEventObject is undefined.");
  }

  var parameters = commonEventObject.parameters;
  var formInputs = commonEventObject.formInputs;
  if (!parameters || !parameters.messageId || !parameters.newSubject) {
    return createErrorCard("Error: Missing parameters for sending reply.");
  }

  var messageId = parameters.messageId;
  var newSubject = parameters.newSubject;
  var generatedReply = (formInputs && formInputs.generatedReply) ? formInputs.generatedReply.stringInputs.value[0] : parameters.generatedReply;

  Logger.log("Message ID: " + messageId);
  Logger.log("New Subject: " + newSubject);
  Logger.log("Generated Reply: " + generatedReply);

  var message = GmailApp.getMessageById(messageId);
  if (!message) {
    return createErrorCard("Error: Could not fetch message with ID: " + messageId);
  }

  var thread = message.getThread();
  var recipient = message.getFrom();

  Logger.log("Recipient: " + recipient);

  GmailApp.sendEmail(recipient, newSubject, generatedReply, {
    threadId: thread.getId()
  });

  var card = CardService.newCardBuilder()
    .addSection(CardService.newCardSection()
      .addWidget(CardService.newTextParagraph().setText("<b>Reply sent successfully to " + recipient + ".</b>")))
    .build();

  return card;
}

function getGeneratedReplyFromFalcon(prompt) {
  var payload = {
    "inputs": prompt,
    "parameters": {
      "max_length": 8000,
      "do_sample": false
    }
  };
  var options = {
    "method": "POST",
    "contentType": "application/json",
    "headers": {
      "Authorization": "Bearer " + FALCON_API_TOKEN
    },
    "payload": JSON.stringify(payload),
    "muteHttpExceptions": true
  };
  try {
    var response = UrlFetchApp.fetch(FALCON_API_URL, options);
    var data = JSON.parse(response.getContentText());
    if (data && data.length > 0 && data[0].generated_text) {
      return data[0].generated_text;
    } else if (data && data.error) {
      return "Error from Falcon API: " + data.error;
    } else {
      return "No response generated.";
    }
  } catch (e) {
    return "Error fetching response.";
  }
}

function getMessageId(e) {
  if (e && e.messageMetadata && e.messageMetadata.messageId) {
    return e.messageMetadata.messageId;
  } else if (e && e.commonEventObject && e.commonEventObject.parameters && e.commonEventObject.parameters.messageId) {
    return e.commonEventObject.parameters.messageId;
  }
  return null;
}

function formatDate(date) {
  var d = new Date(date),
      month = '' + (d.getMonth() + 1),
      day = '' + d.getDate(),
      year = d.getFullYear();
  if (month.length < 2) month = '0' + month;
  if (day.length < 2) day = '0' + day;
  return [year, month, day].join('-');
}