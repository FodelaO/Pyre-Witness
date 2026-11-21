<!-- Records the Slack escalation integration and its verification. -->
# Slack escalation

Each newly raised risk or loss alert posts to the server’s Slack route once per tab, including the rehearsal alert. The card shows the result beside the call controls. The payload uses the alert’s asset, estimate, risk, and proposed action, with a simulated-plant label and a separate test marker. A risk score of 80 or higher uses red, following the rules engine’s critical band. A missing estimate is reported as unavailable.

The route validates the alert, keeps the webhook on the server, and times out after eight seconds. The demo guide documents `SLACK_WEBHOOK_URL`. [Slack incoming webhooks](https://api.slack.com/messaging/webhooks)

Five focused tests cover the rehearsal trigger, duplicate prevention, message body, missing configuration, invalid input, and a webhook exception. The running route on port 4119 returned the expected missing-configuration receipt. Browser automation could not launch, so the rendered card was not verified. No live Slack message was sent. No shared contract changes were needed.
