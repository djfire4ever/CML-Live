export async function handler(event) {
<<<<<<< HEAD
    const url = "https://script.google.com/macros/s/AKfycbzd_0wJUUB8AyjmBd_Z5ZMjkch3RTWR66qbBFen_0li0KwcoVZVGBgRQWKzwePFRDjZ/exec";
=======
    const url = "https://script.google.com/macros/s/AKfycbz0n1Br3EO0z7Dukhqo0bZ_QKCZ-3hLjjsLdZye6kBPdu7Wdl7ag9dTBbgiJ5ArrCQ/exec";
>>>>>>> 109388c609ef811b7d9dbbb3194d148332079127
  
    try {
      const isGet = event.httpMethod === "GET";
      const isPost = event.httpMethod === "POST";
  
      const options = {
        method: event.httpMethod,
        headers: {
          "Content-Type": "application/json"
        },
        ...(isPost && { body: event.body })
      };
  
<<<<<<< HEAD
      const query = event.rawUrl.split("/.netlify/functions/leadProxy")[1] || "";
=======
      const query = event.rawUrl.split("/.netlify/functions/leadproxy")[1] || "";
>>>>>>> 109388c609ef811b7d9dbbb3194d148332079127
      const fullURL = isGet ? `${url}${query}` : url;
  
      const res = await fetch(fullURL, options);
      const text = await res.text();
  
      return {
        statusCode: res.status,
        body: text,
        headers: {
          "Access-Control-Allow-Origin": "*"
        }
      };
    } catch (error) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: error.message })
      };
    }
  }
<<<<<<< HEAD
  
=======
  

// force redeploy 10/24/2025 15:50:55

// redeploy fix timestamp: 2025-10-24 16:14
>>>>>>> 109388c609ef811b7d9dbbb3194d148332079127
