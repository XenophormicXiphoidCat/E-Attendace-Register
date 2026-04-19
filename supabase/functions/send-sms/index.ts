interface SMSPayload {
  phone: string
  message: string
}

Deno.serve(async (request) => {
  try {
    const { phone, message } = (await request.json()) as SMSPayload
    if (!phone || !message) {
      return new Response(JSON.stringify({ error: 'phone and message are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const endpoint = Deno.env.get('SMS_API_URL')
    const apiKey = Deno.env.get('SMS_API_KEY')

    if (!endpoint || !apiKey) {
      return new Response(JSON.stringify({ ok: true, mode: 'mock' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ phone, message }),
    })

    const body = await response.text()
    return new Response(body, {
      status: response.status,
      headers: { 'Content-Type': response.headers.get('Content-Type') ?? 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
