export type ImgurPrivacy = 'public' | 'hidden';

export interface ImgurUploadResult {
  link: string;
  deletehash: string;
  id: string;
}

export async function uploadToImgur(
  blob: Blob,
  apiKey: string,
  title: string,
  privacy: ImgurPrivacy,
): Promise<ImgurUploadResult> {
  const base64 = await blobToBase64(blob);

  const res = await fetch('https://api.imgur.com/3/image', {
    method: 'POST',
    headers: {
      Authorization: `Client-ID ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      image: base64,
      type: 'base64',
      title,
      privacy,
    }),
  });

  if (!res.ok) {
    let message = `Imgur API error (${res.status})`;
    try {
      const body = await res.json();
      if (body?.data?.error) message = body.data.error;
      else if (body?.message) message = body.message;
    } catch {
      // ignore parse failure
    }
    throw new Error(message);
  }

  const json = await res.json();
  if (!json?.data?.link) {
    throw new Error('Imgur API returned no image link');
  }

  return {
    link: json.data.link,
    deletehash: json.data.deletehash ?? '',
    id: json.data.id ?? '',
  };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const commaIdx = result.indexOf(',');
      resolve(commaIdx >= 0 ? result.slice(commaIdx + 1) : result);
    };
    reader.onerror = () => reject(new Error('Failed to convert image to base64'));
    reader.readAsDataURL(blob);
  });
}
