import puppeteer from "puppeteer-core"

// 💡Enabling "Use Playground Settings" will overwrite your playground code’s connection parameters.
const query = new URLSearchParams({
  token: "sk_qiOPUBP6qRATPOViVy5RRAbjWqs9uYS7YeiedOdL2g10Lc0iDPmABWDMWLRPESfF",
  proxyCountry: "ANY",
  sessionRecording: true,
  sessionTTL: 900,
  sessionName: "reCAPTCHA V2",
})

const connectionURL = `wss://browser.scrapeless.com/api/v2/browser?${query.toString()}`

const browser = await puppeteer.connect({
  browserWSEndpoint: connectionURL,
  defaultViewport: null,
})

example("https://recaptcha-demo.appspot.com/recaptcha-v2-checkbox-explicit.php")

async function example(url) {
  try {
    const page = await browser.newPage()
    // Listen for captcha events using native promise resolve
    const captchaPromise = addCaptchaListener(page)
    console.log("Navigated to URL:", url)
    await page.goto(url, { timeout: 30000, waitUntil: "domcontentloaded" })
    console.log("onCaptchaFinished: Waiting for captcha solving to finish...")
    await onCaptchaFinished(captchaPromise)
    const btnSubmit = await page.waitForSelector('button[type="submit"]')
    await btnSubmit.click()
    // Screenshot for debugging
    await page.screenshot({ path: "scrapeless-reCAPTCHA_V2-screenshot.png", fullPage: true })
    await new Promise((resolve) => setTimeout(resolve, 10000)) // Wait for a moment, watch captcha finished
  } catch (error) {
    console.error(error)
  } finally {
    await browser.close()
    console.log("Browser closed")
  }
}

async function addCaptchaListener(page) {
  return new Promise(async (resolve) => {
    const client = await page.createCDPSession()

    client.on("Captcha.detected", (msg) => {
      console.log("Captcha.detected:", msg)
    })

    client.on("Captcha.solveFinished", async (msg) => {
      console.log("Captcha.solveFinished:", msg)
      resolve(msg)
      client.removeAllListeners()
    })
  })
}

async function onCaptchaFinished(promise, timeout = 60_000) {
  return Promise.race([promise, new Promise((_, reject) => setTimeout(() => reject("Timeout"), timeout))])
}
