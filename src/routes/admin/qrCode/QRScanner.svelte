<script>
  import { Html5QrcodeScanner } from "html5-qrcode";

  let qrCodeResult = "";
  let isScannerOpen = false;
  let scanner = null;

  const closeScanner = () => {
    if (isScannerOpen && scanner) {
      scanner
        .clear() // Stops and clears the scanner
        .then(() => {
          isScannerOpen = false;
        })
        .catch((err) => console.log("Camera stop error:", err));
      scanner = null;
    }
  };

  const startScanner = () => {
    isScannerOpen = true;
    scanner = new Html5QrcodeScanner(
      "qr-reader",
      {
        fps: 10,
        qrbox: { width: 250, height: 250 },
      },
      false
    );
    scanner.render(
      (decodedText) => {
        qrCodeResult = decodedText; // handle the decoded result
        scanner.clear();
        scanner = null;
        // Stops the scanner after a successful scan
      },
      (error) => console.log("QR code scan error:", error)
    );
  };
</script>

<div class="flex flex-col items-center space-y-3">
  <div id="qr-reader"></div>
  {#if !scanner}
    <button on:click={startScanner} class="btn btn-primary"
      >Start QR Scanner</button
    >
  {/if}

  {#if scanner}
    <button on:click={closeScanner} class="btn btn-primary">Stop Scan</button>
  {/if}

  <p>{qrCodeResult ? `QR Code Result: ${qrCodeResult}` : ""}</p>
</div>
