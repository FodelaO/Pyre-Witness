/** Small, synthetic publisher-format fixtures for feed parser tests only. */
export const KEV_FIXTURE = JSON.stringify({
  title: "Fixture KEV",
  vulnerabilities: [{
    cveID: "CVE-2099-1234", vendorProject: "Fortinet", product: "FortiOS",
    vulnerabilityName: "Fortinet FortiOS security advisory",
    dateAdded: "2026-11-20", shortDescription: "Review the version in the vendor advisory.",
  }, { cveID: "malformed" }],
});

export const ICS_FIXTURE = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Fixture ICS</title><item>
  <title>Siemens SIMATIC S7-1500 &amp; related controllers</title>
  <link>https://www.cisa.gov/news-events/ics-advisories/icsa-26-323-03</link>
  <description><![CDATA[<p>Review <b>CVE-2099-5678</b> and CVE-2099-5678.</p>]]></description>
  <pubDate>Thu, 19 Nov 26 12:00:00 +0000</pubDate>
</item><item>
  <title>Disallowed URL</title><link>javascript:alert(1)</link><pubDate>Thu, 19 Nov 26 12:00:00 +0000</pubDate>
</item></channel></rss>`;

export const NEWS_FIXTURE = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Fixture news</title><item>
  <title>Manufacturer reports a cyber incident</title>
  <link>https://www.ncsc.gov.uk/news/test-incident</link>
  <description><![CDATA[<p>Source confirms an investigation.</p>]]></description>
  <pubDate>Tue, 17 Nov 2026 12:00:00 +0000</pubDate>
</item></channel></rss>`;
