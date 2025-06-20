<script>
    // Support page logic
  </script>
  
  <svelte:head>
    <title>Support - DeviceNet Seller Dashboard</title>
  </svelte:head>
  
  <div class="support-container">
    <h1>Support</h1>
    <p class="text-black">Get help and support for your DeviceNet seller account.</p>
    
    <div class="support-sections">
      <section class="support-section">
        <h2 class="text-black">📚 Knowledge Base</h2>
        <p class="text-black">Find answers to common questions and learn how to use the platform effectively.</p>
      </section>
      
      <section class="support-section">
        <h2 class="text-black">💬 Contact Support</h2>
        <p class="text-black">Need personalized help? Our support team is here to assist you.</p>
        <button class="contact-btn">Contact Us</button>
      </section>
      
      <section class="support-section">
        <h2>🐛 Report Issues</h2>
        <p>Found a bug or technical issue? Let us know so we can fix it.</p>
        <button class="report-btn">Report Issue</button>
      </section>
      
      <section class="support-section">
        <h2>📖 Documentation</h2>
        <p>Access detailed documentation and API guides for developers.</p>
      </section>
    </div>
  </div>
  
  <style>
    .support-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .support-container h1 {
      color: black;
      margin-bottom: 10px;
    }
    
    .support-container > p {
      color: black;
     
      margin-bottom: 30px;
    }
    
    .support-sections {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 20px;
    }
    
    .support-section {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(81, 80, 80, 0.2);
      border-radius: 12px;
      padding: 20px;
    }
    
    .support-section h2 {
      color: black;
      margin-bottom: 10px;
      font-size: 18px;
    }
    
    .support-section p {
      color: black;
      margin-bottom: 15px;
      font-size: 14px;
    }
    
    .contact-btn, .report-btn {
      background: linear-gradient(135deg, #00ff88, #00cc6a);
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.3s ease;
    }
    
    .contact-btn:hover, .report-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 5px 15px rgba(0, 255, 136, 0.3);
    }
  </style>