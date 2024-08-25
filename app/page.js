"use client";

import { useState } from "react"; 
import { Box, Stack, TextField, Button, Typography, useTheme } from '@mui/material';

export default function Home() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hi, I'm the ratemyprofessor support bot. How can I help you today?",
    }
  ]);

  const [message, setMessage] = useState("");

  const sendMessage = async () => {
    setMessage('');
    setMessages((messages) => [
      ...messages,
      { role: 'user', content: message },
      { role: 'assistant', content: '' },
    ]);

    const response = fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([...messages, { role: 'user', content: message }]),
    }).then(async (res) => {
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let result = '';

      return reader.read().then(function processText({ done, value }) {
        if (done) {
          return result;
        }
        const text = decoder.decode(value || new Uint8Array(), { stream: true });
        setMessages((messages) => {
          let lastMessage = messages[messages.length - 1];
          let otherMessages = messages.slice(0, messages.length - 1);
          return [
            ...otherMessages,
            { ...lastMessage, content: lastMessage.content + text },
          ];
        });
        return reader.read().then(processText);
      });
    });
  };

  const theme = useTheme();

  return (
    <Box
      width="100vw"
      height="100vh"
      display="flex"
      flexDirection="column"
      justifyContent="center"
      alignItems="center"
      bgcolor="#121212"  
      p={2}
    >
      <Stack
        direction={'column'}
        width="500px"
        height="700px"
        border="1px solid #333"  
        borderRadius={4}
        boxShadow={4}
        p={2}
        spacing={3}
        bgcolor="#1e1e1e" 
      >
        <Stack
          direction={'column'}
          spacing={2}
          flexGrow={1}
          overflow="auto"
          maxHeight="100%"
          p={1}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              display="flex"
              justifyContent={
                message.role === 'assistant' ? 'flex-start' : 'flex-end'
              }
            >
              <Box
                bgcolor={
                  message.role === 'assistant'
                    ? '#333333' 
                    : '#2d2d2d'  
                }
                color="#ffffff"  
                borderRadius={2}
                p={2}
                boxShadow={2}
                maxWidth="75%"
              >
                <Typography variant="body1">
                  {message.content}
                </Typography>
              </Box>
            </Box>
          ))}
        </Stack>
        <Stack direction={'row'} spacing={2}>
          <TextField
            label="Message"
            fullWidth
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            variant="outlined"
            InputProps={{
              style: {
                color: '#ffffff',  
                borderColor: '#fff',  
              }
            }}
            InputLabelProps={{
              style: { color: '#888' }  
            }}
          />
          <Button
            variant="contained"
            onClick={sendMessage}
            style={{
              backgroundColor: '#555',  
              color: '#ffffff',
              boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.2)',  
            }}
          >
            Send
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
