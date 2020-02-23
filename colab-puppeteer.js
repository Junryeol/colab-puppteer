// const puppeteer = require("puppeteer")

const puppeteer = require("puppeteer-extra")
const pluginStealth = require("puppeteer-extra-plugin-stealth")
puppeteer.use(pluginStealth())

const chromeLauncher = require('chrome-launcher')
const axios = require('axios')

const chromeConfig = {
  chromeFlags: ['--headless'],
  chromePath: "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe"
  // chromePath: "/usr/bin/google-chrome-stable"
}

const user = {
  email: "",
  password: Buffer.from("", 'base64').toString()
}

async function func(){
  const chrome = await chromeLauncher.launch(chromeConfig)
  const response = await axios.get(`http://localhost:${chrome.port}/json/version`)
  const { webSocketDebuggerUrl } = response.data
  const browser = await puppeteer.connect({ browserWSEndpoint: webSocketDebuggerUrl })
  console.log("open browser")

  // const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.goto('https://accounts.google.com/ServiceLogin?hl=ko&passive=true&continue=https://colab.research.google.com/notebooks/welcome.ipynb')
  console.log("login page")
  
  await page.waitFor('#identifierId', { visible: true })
  await page.type('#identifierId', user.email)
  
  await page.waitFor(1000)
  await page.waitForSelector('#identifierNext > .CwaK9', { visible: true })
  await page.click('#identifierNext > .CwaK9')

  await page.waitFor(1000)
  await page.waitForSelector('#password input[type=password]', { visible: true })
  await page.type('#password input[type=password]', user.password)
    
  await page.waitFor(1000)
  await page.waitForSelector('#passwordNext > .ZFr60d', { visible: true })
  await page.click('#passwordNext > .ZFr60d')
  console.log("login success")
  
  await page.waitForSelector('#toolbar-add-code > .style-scope > .button-content')
  await page.click('#toolbar-add-code > .style-scope > .button-content')
  
  await page.waitFor(1000)

  await page.keyboard.type(`

!wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | sudo apt-key add - &> /dev/null
!sudo sh -c 'echo "deb https://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google.list' &> /dev/null
!sudo apt-get update &> /dev/null
!sudo apt-get install google-chrome-stable &> /dev/null

!curl -sL https://deb.nodesource.com/setup_12.x | sudo -E bash - &> /dev/null
!sudo apt-get install nodejs &> /dev/null

!wget https://bin.equinox.io/c/4VmDzA7iaHb/ngrok-stable-linux-amd64.zip &> /dev/null
!unzip ngrok-stable-linux-amd64.zip &> /dev/null

!nohup python3 -m http.server &> /dev/null &
!nohup ./ngrok http 8000 &> /dev/null &

!curl -s http://localhost:4040/api/tunnels 
  `)
  console.log("code typing")
  
  await page.keyboard.down('ControlLeft')
  await page.keyboard.press('Enter')
  await page.keyboard.up('ControlLeft')
  console.log("run code")
  
  page.exposeFunction('puppeteerMutationListener', puppeteerMutationListener);

  await page.waitForSelector('.codecell-input-output .execution-count')
  await page.evaluate(() => {
    const target = document.querySelector('.codecell-input-output .execution-count');
    const observer = new MutationObserver((mutationsList) => {
      for (const mutation of mutationsList) {
        window.puppeteerMutationListener(
          mutation.removedNodes[0].textContent,
          mutation.addedNodes[0].textContent,
        );
      }
    });
    observer.observe(
      target,
      { childList: true },
    );
  });

  async function puppeteerMutationListener(oldValue, newValue) {
    const elementHandle = await page.waitForSelector('.output-iframe-container iframe')
    const iframe = await elementHandle.contentFrame()
    const pre = await iframe.waitForSelector('#output-body pre')
    const text = await pre.getProperty('textContent')
    const result = await text.jsonValue()
    console.log("tunneling info")
    console.log(result)
    
    await browser.close()
    await chrome.kill()
    console.log("close browser")
  }
}

func()