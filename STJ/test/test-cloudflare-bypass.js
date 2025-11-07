import puppeteer from "puppeteer-core";
import dotenv from "dotenv";

dotenv.config();

// Técnicas anti-detecção avançadas
async function applyAdvancedAntiDetection(page) {
  await page.evaluateOnNewDocument(() => {
    // 1. Remover webdriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
    
    delete navigator.__proto__.webdriver;
    
    // 2. Chrome runtime
    window.chrome = {
      runtime: {},
      loadTimes: function() {},
      csi: function() {},
      app: {}
    };
    
    // 3. Permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
    
    // 4. Plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => [
        {
          0: {type: "application/x-google-chrome-pdf", suffixes: "pdf", description: "Portable Document Format"},
          description: "Portable Document Format",
          filename: "internal-pdf-viewer",
          length: 1,
          name: "Chrome PDF Plugin"
        },
        {
          0: {type: "application/pdf", suffixes: "pdf", description: ""},
          description: "",
          filename: "mhjfbmdgcfjbbpaeojofohoefgiehjai",
          length: 1,
          name: "Chrome PDF Viewer"
        },
        {
          0: {type: "application/x-nacl", suffixes: "", description: "Native Client Executable"},
          1: {type: "application/x-pnacl", suffixes: "", description: "Portable Native Client Executable"},
          description: "",
          filename: "internal-nacl-plugin",
          length: 2,
          name: "Native Client"
        }
      ],
    });
    
    // 5. Languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['pt-BR', 'pt', 'en-US', 'en'],
    });
    
    // 6. Platform
    Object.defineProperty(navigator, 'platform', {
      get: () => 'Win32',
    });
    
    // 7. Hardware Concurrency
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => 8,
    });
    
    // 8. Device Memory
    Object.defineProperty(navigator, 'deviceMemory', {
      get: () => 8,
    });
    
    // 9. User Agent
    Object.defineProperty(navigator, 'userAgent', {
      get: () => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    });
    
    // 10. Vendor
    Object.defineProperty(navigator, 'vendor', {
      get: () => 'Google Inc.',
    });
    
    // 11. MaxTouchPoints
    Object.defineProperty(navigator, 'maxTouchPoints', {
      get: () => 0,
    });
    
    // 12. Connection
    Object.defineProperty(navigator, 'connection', {
      get: () => ({
        effectiveType: '4g',
        rtt: 50,
        downlink: 10,
        saveData: false
      }),
    });
    
    // 13. Battery (se disponível)
    if (navigator.getBattery) {
      navigator.getBattery = () => Promise.resolve({
        charging: true,
        chargingTime: 0,
        dischargingTime: Infinity,
        level: 1
      });
    }
    
    // 14. Media Devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      const originalEnumerateDevices = navigator.mediaDevices.enumerateDevices;
      navigator.mediaDevices.enumerateDevices = () => {
        return originalEnumerateDevices().then(devices => {
          return devices.length > 0 ? devices : [
            {deviceId: "default", kind: "audioinput", label: "", groupId: "default"},
            {deviceId: "default", kind: "audiooutput", label: "", groupId: "default"},
            {deviceId: "default", kind: "videoinput", label: "", groupId: "default"}
          ];
        });
      };
    }
    
    // 15. Screen
    Object.defineProperty(screen, 'width', { get: () => 1920 });
    Object.defineProperty(screen, 'height', { get: () => 1080 });
    Object.defineProperty(screen, 'availWidth', { get: () => 1920 });
    Object.defineProperty(screen, 'availHeight', { get: () => 1040 });
    Object.defineProperty(screen, 'colorDepth', { get: () => 24 });
    Object.defineProperty(screen, 'pixelDepth', { get: () => 24 });
    
    // 16. Date/Timezone
    Date.prototype.getTimezoneOffset = function() {
      return 180; // UTC-3 (Brasília)
    };
    
    // 17. WebGL
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter) {
      if (parameter === 37445) {
        return 'Intel Inc.';
      }
      if (parameter === 37446) {
        return 'Intel(R) UHD Graphics 620';
      }
      return getParameter.call(this, parameter);
    };
    
    // 18. Canvas Fingerprint (adicionar ruído)
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function(type) {
      const context = this.getContext('2d');
      if (context) {
        const imageData = context.getImageData(0, 0, this.width, this.height);
        for (let i = 0; i < imageData.data.length; i += 4) {
          imageData.data[i] += Math.floor(Math.random() * 3) - 1;
        }
        context.putImageData(imageData, 0, 0);
      }
      return originalToDataURL.apply(this, arguments);
    };
    
    // 19. AudioContext Fingerprint
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (AudioContext) {
      const originalCreateOscillator = AudioContext.prototype.createOscillator;
      AudioContext.prototype.createOscillator = function() {
        const oscillator = originalCreateOscillator.call(this);
        const originalStart = oscillator.start;
        oscillator.start = function(when) {
          const noise = (Math.random() - 0.5) * 0.0001;
          return originalStart.call(this, when ? when + noise : noise);
        };
        return oscillator;
      };
    }
    
    // 20. Function.prototype.toString (esconder modificações)
    const originalToString = Function.prototype.toString;
    Function.prototype.toString = function() {
      if (this === navigator.permissions.query) {
        return 'function query() { [native code] }';
      }
      if (this === navigator.getBattery) {
        return 'function getBattery() { [native code] }';
      }
      return originalToString.call(this);
    };
    
    console.log('✅ Técnicas anti-detecção avançadas aplicadas');
  });
}

const fingerprint = {
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  platform: 'Windows',
  screen: {
    width: 1920,
    height: 1080
  },
  localization: {
    languages: ['pt-BR', 'pt', 'en-US', 'en'],
    timezone: 'America/Sao_Paulo',
    geolocation: {
      latitude: -23.5505,
      longitude: -46.6333,
      accuracy: 100
    }
  },
  args: {
    '--window-size': '1920,1080',
    '--disable-blink-features': 'AutomationControlled',
  }
};

const queryParams = {
  token: process.env.SCRAPELESS_TOKEN,
  sessionRecording: true,
  sessionTTL: 900,
  sessionName: "STJ Cloudflare Bypass Test",
  fingerprint: encodeURIComponent(JSON.stringify(fingerprint)),
  incognito: true,
};

const query = new URLSearchParams(queryParams);
const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`;

console.log("🔗 Conectando ao Scrapeless...");
const browser = await puppeteer.connect({
  browserWSEndpoint: connectionURL,
  defaultViewport: null,
});

console.log("✅ Conectado!");

const page = await browser.newPage();

// Aplicar técnicas anti-detecção
console.log("🛡️ Aplicando técnicas anti-detecção avançadas...");
await applyAdvancedAntiDetection(page);

// Listener de CAPTCHA
const client = await page.createCDPSession();

let captchaDetected = false;
let captchaSolved = false;

client.on("Captcha.detected", (msg) => {
  console.log("🔍 CAPTCHA DETECTADO:", JSON.stringify(msg, null, 2));
  captchaDetected = true;
});

client.on("Captcha.solveFinished", (msg) => {
  console.log("✅ CAPTCHA RESOLVIDO:", JSON.stringify(msg, null, 2));
  captchaSolved = true;
});

const url = "https://scon.stj.jus.br/SCON/jurisprudencia/toc.jsp";

console.log(`\n🌐 Navegando para: ${url}`);
await page.goto(url, { timeout: 90000, waitUntil: "domcontentloaded" });
console.log("✅ Página carregada");

// Aguardar resolução do CAPTCHA
console.log("\n⏳ Aguardando resolução do Cloudflare Turnstile...");
let waited = 0;
while (!captchaSolved && waited < 60) {
  await new Promise(resolve => setTimeout(resolve, 1000));
  waited++;
  if (waited % 5 === 0) {
    console.log(`   ⏱️ ${waited}s aguardando...`);
  }
}

if (captchaSolved) {
  console.log("\n✅ Cloudflare Turnstile resolvido!");
  
  // Aguardar mais 5 segundos para página carregar completamente
  console.log("⏳ Aguardando página carregar completamente...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Verificar se há bloqueio adicional
  const pageContent = await page.content();
  const hasBlock = pageContent.includes('Access denied') || 
                   pageContent.includes('blocked') || 
                   pageContent.includes('bot') ||
                   pageContent.includes('automated');
  
  console.log(`\n📊 Verificação de bloqueio: ${hasBlock ? "❌ BLOQUEADO" : "✅ LIBERADO"}`);
  
  // Screenshot final
  await page.screenshot({ path: "cloudflare-bypass-result.png", fullPage: true });
  console.log("📸 Screenshot salvo: cloudflare-bypass-result.png");
  
} else {
  console.log("\n❌ Timeout aguardando resolução do Cloudflare");
}

console.log("\n🔒 Fechando browser...");
await browser.close();
console.log("✅ Teste concluído!");

