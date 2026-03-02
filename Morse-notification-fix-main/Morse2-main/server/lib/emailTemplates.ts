export const newDMEmail = (toName: string, fromName: string, message: string) => ({
  subject: `New message from ${fromName}`,
  html: `
    <h2>You have a new message</h2>
    <p><b>${fromName}</b> sent you a message:</p>
    <blockquote>${message}</blockquote>
  `
});

export const newFollowRequestEmail = (toName: string, fromName: string) => ({
  subject: `${fromName} sent you a follow request`,
  html: `
    <h2>New Follow Request</h2>
    <p><b>${fromName}</b> wants to follow you.</p>
  `
});

export const followAcceptedEmail = (toName: string, accepterName: string) => ({
  subject: `${accepterName} accepted your follow request`,
  html: `
    <h2>Follow Request Accepted</h2>
    <p><b>${accepterName}</b> accepted your follow request.</p>
  `
});
