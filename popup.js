document.addEventListener('DOMContentLoaded', function() {
  const toggleBot = document.getElementById('toggleBot');
  const fireworksApiKey = document.getElementById('fireworksApiKey');
  const toggleApiKey = document.getElementById('toggleApiKey');
  const saveConfig = document.getElementById('saveConfig');
  const testConnection = document.getElementById('testConnection');
  const status = document.getElementById('status');
  const apiKeyStatus = document.getElementById('apiKeyStatus');

  // Load saved configuration
  loadConfig();

  // Toggle API key visibility
  toggleApiKey.addEventListener('click', function() {
    if (fireworksApiKey.type === 'password') {
      fireworksApiKey.type = 'text';
      toggleApiKey.textContent = '🙈';
    } else {
      fireworksApiKey.type = 'password';
      toggleApiKey.textContent = '👁️';
    }
  });

  // API key validation with enhanced feedback
  fireworksApiKey.addEventListener('input', function() {
    const key = fireworksApiKey.value.trim();
    if (key.length === 0) {
      apiKeyStatus.textContent = '';
      apiKeyStatus.style.opacity = '0';
    } else if (key.length < 20) {
      apiKeyStatus.textContent = '⚠️ Too short';
      apiKeyStatus.style.color = '#ff9800';
      apiKeyStatus.style.opacity = '1';
    } else if (key.startsWith('fw') || key.startsWith('sk-') || key.includes('fireworks')) {
      apiKeyStatus.textContent = '✅ Valid format';
      apiKeyStatus.style.color = '#4caf50';
      apiKeyStatus.style.opacity = '1';
    } else {
      apiKeyStatus.textContent = '❓ Check format';
      apiKeyStatus.style.color = '#ff9800';
      apiKeyStatus.style.opacity = '1';
    }
  });

  // Toggle bot functionality
  toggleBot.addEventListener('click', function() {
    toggleBot.classList.toggle('active');
    const isEnabled = toggleBot.classList.contains('active');
    saveConfigToStorage({ botEnabled: isEnabled });
    showStatus(`Bot ${isEnabled ? 'enabled' : 'disabled'}`, 'success');
  });

  // Save configuration with enhanced feedback
  saveConfig.addEventListener('click', function() {
    // Add loading state
    const originalText = saveConfig.textContent;
    saveConfig.textContent = '⏳ Saving...';
    saveConfig.disabled = true;
    
    const config = {
      fireworksApiKey: fireworksApiKey.value,
      botEnabled: toggleBot.classList.contains('active')
    };

    if (!config.fireworksApiKey) {
      showStatus('Please fill in the Fireworks API key', 'error');
      saveConfig.textContent = originalText;
      saveConfig.disabled = false;
      return;
    }

    saveConfigToStorage(config);
    showStatus('Configuration saved successfully!', 'success');
    
    // Reset button after delay
    setTimeout(() => {
      saveConfig.textContent = originalText;
      saveConfig.disabled = false;
    }, 1500);
  });

  // Test connection with enhanced feedback
  testConnection.addEventListener('click', function() {
    const config = {
      fireworksApiKey: fireworksApiKey.value
    };

    if (!config.fireworksApiKey) {
      showStatus('Please fill in the Fireworks API key first', 'error');
      return;
    }

    // Add loading state
    const originalText = testConnection.textContent;
    testConnection.textContent = '⏳ Testing...';
    testConnection.disabled = true;
    showStatus('Testing connection...', 'success');
    
    // Send test message to background script
    chrome.runtime.sendMessage({
      action: 'testConnection',
      config: config
    }, function(response) {
      // Reset button
      testConnection.textContent = originalText;
      testConnection.disabled = false;
      
      if (response && response.success) {
        showStatus('🎉 Connection test successful!', 'success');
      } else {
        showStatus('❌ Connection test failed: ' + (response?.error || 'Unknown error'), 'error');
      }
    });
  });

  function loadConfig() {
    chrome.storage.sync.get([
      'fireworksApiKey',
      'botEnabled'
    ], function(result) {
      if (result.fireworksApiKey) fireworksApiKey.value = result.fireworksApiKey;
      if (result.botEnabled) toggleBot.classList.add('active');
    });
  }

  function saveConfigToStorage(config) {
    chrome.storage.sync.set(config);
  }

  function showStatus(message, type) {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = 'block';
    status.style.opacity = '0';
    status.style.transform = 'translateY(10px)';
    
    // Animate in
    setTimeout(() => {
      status.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
      status.style.opacity = '1';
      status.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
      // Animate out
      status.style.opacity = '0';
      status.style.transform = 'translateY(-10px)';
      setTimeout(() => {
        status.style.display = 'none';
      }, 300);
    }, 3000);
  }
});
