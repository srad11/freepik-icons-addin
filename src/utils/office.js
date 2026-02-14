/* global Office */

export function initializeOffice() {
  return new Promise((resolve, reject) => {
    // Timeout after 10 seconds in case Office.onReady never fires
    const timeout = setTimeout(() => {
      reject(new Error("Office.onReady timed out after 10 seconds."));
    }, 10000);

    try {
      Office.onReady((info) => {
        clearTimeout(timeout);
        console.log("Office.onReady fired:", JSON.stringify(info));
        // Accept any host — the manifest already restricts to PowerPoint
        resolve(info);
      });
    } catch (err) {
      clearTimeout(timeout);
      reject(new Error("Office.onReady failed: " + err.message));
    }
  });
}

export function insertImageToSlide(base64Data) {
  return new Promise((resolve, reject) => {
    // Strip data URL prefix if present
    const raw = base64Data.replace(/^data:image\/[^;]+;base64,/, '');
    Office.context.document.setSelectedDataAsync(
      raw,
      { coercionType: Office.CoercionType.Image },
      (result) => {
        if (result.status === Office.AsyncResultStatus.Succeeded) {
          resolve(result);
        } else {
          reject(new Error(result.error.message));
        }
      }
    );
  });
}

export async function getBase64FromUrl(url) {
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export async function insertImageFromUrl(url) {
  const base64Data = await getBase64FromUrl(url);
  return insertImageToSlide(base64Data);
}
