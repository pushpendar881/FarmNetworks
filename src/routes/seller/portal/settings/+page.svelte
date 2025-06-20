<script>
    // Settings page logic
  </script>
  
  <svelte:head>
    <title>Settings - DeviceNet Seller Dashboard</title>
  </svelte:head>
  
  <div class="settings-container">
    <h1>Settings</h1>
    <p>Configure your seller dashboard settings here.</p>
    
    <div class="settings-sections">
      <section class="settings-section">
        <h2>Account Settings</h2>
        <p>Manage your account preferences and information.</p>
      </section>
      
      <section class="settings-section">
        <h2>Notifications</h2>
        <p>Configure your notification preferences.</p>
      </section>
      
      <section class="settings-section">
        <h2>Privacy & Security</h2>
        <p>Manage your privacy and security settings.</p>
      </section>
    </div>
  </div>
  
  <style>
    .settings-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }
    
    .settings-container h1 {
      color: black;
      margin-bottom: 10px;
    }
    
    .settings-container p {
      color: rgba(0, 0, 0, 0.8);
      margin-bottom: 30px;
    }
    
    .settings-sections {
      display: grid;
      gap: 20px;
    }
    
    .settings-section {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(20px);
      border: 1px solid rgba(84, 82, 82, 0.2);
      border-radius: 12px;
      padding: 20px;
    }
    
    .settings-section h2 {
      color: rgb(0, 0, 0);
      margin-bottom: 10px;
      font-size: 18px;
    }
    
    .settings-section p {
      color: rgba(0, 0, 0, 0.7);
      margin: 0;
      font-size: 14px;
    }
  </style>