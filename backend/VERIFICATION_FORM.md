# SPSC Website Verification Results

**Date:** 2025-12-23  
**Inspector:** Abishek Khanal

---

## STEP 1: Website Access

### Homepage URL
```
https://spsc.sikkim.gov.in
```

**Status:** [ ] Accessible

---

## STEP 2: Notifications Page

### Notifications Page URL
```
https://spsc.sikkim.gov.in/Notifications.html
```

## STEP 3: Page Structure

### Job Listing Structure
- [ ] **Div-based** - Jobs are in `<div>` containers

---

## STEP 4: HTML Sample

### Copy ONE Job Row HTML

**Instructions:**
1. Right-click on a job listing
2. Select "Inspect" or "Inspect Element"
3. Find the HTML element that contains ONE complete job entry
4. Right-click on that element → Copy → Copy outerHTML
5. Paste below:

```html
[PASTE HTML HERE - Should be 5-20 lines showing one complete job entry]

<tr id="myTable_row_1" class="job-row">
  <td class="job-cell">
    <div class="job-entry">
      <!-- Job Title/Description Link -->
      <a href="/Advertisement.html" class="job-title-link">
        Advertisement for 24 (twenty four) posts of Labour Inspector under the Sikkim State Labour Service Cadre under Labour Department
      </a>
      
      <!-- Advertisement Number -->
      <div class="ad-number">
        <a href="/Advertisement.html" class="ad-number-link">Advertisement No. 19/SPSC/EXAM/2025</a>
      </div>
      
      <!-- Issued Date -->
      <div class="issued-date">
        Issued Date: <span class="date-value">11/12/2025</span>
      </div>
      
      <!-- PDF Links List -->
      <ol class="pdf-links-list">
        <li class="pdf-item">
          <a href="/Advertisements/Labour_Inspector_Adv_11_12_2025.pdf" class="pdf-link advertisement-link" target="_blank" rel="noopener">
            Advertisement
          </a>
        </li>
        <li class="pdf-item">
          <a href="/Advertisements/Labour_Inspector_Notification_11_12_2025.pdf" class="pdf-link notification-link" target="_blank" rel="noopener">
            Notification
          </a>
        </li>
        <li class="pdf-item">
          <a href="/Advertisements/Labour_Inspector_Syllabus_11_12_2025.pdf" class="pdf-link syllabus-link" target="_blank" rel="noopener">
            Scheme and Syllabus
          </a>
        </li>
      </ol>
      
      <!-- Apply Button -->
      <button class="apply-btn">
        <a href="https://spscrecruitment.sikkim.gov.in/rpaonline/login" class="apply-link" target="_blank">
          Click to Apply
        </a>
      </button>
    </div>
  </td>
</tr>


---

## STEP 5: Data Patterns

### Job Title Location
**Where is the job title in the HTML?**
- [ ] In `<a>` link text

**Example job titles you see:**
1. Advertisement for 24 (twenty four) posts of Labour Inspector under the Sikkim State Labour Service Cadre under Labour Department
---

### Date Format
**How are dates displayed?**
- [ ] DD/MM/YYYY

**Example dates you see:**
1. 11/12/2025

---

### PDF Link Pattern
**How are PDF links structured?**

**Example PDF URLs (copy 3 actual URLs):**
```
1. https://spsc.sikkim.gov.in/Advertisements/Labour_Inspector_Adv_11_12_2025.pdf
2. https://spsc.sikkim.gov.in/Advertisements/Sub_Inspector_Excise_Notification_05_12_2025.pdf
3. https://spsc.sikkim.gov.in/Advertisements/Add_Undersecretary_05_12_2025.pdf
```

**Link text pattern:**
The link text is simple, descriptive, and indicates the document type rather than generic terms like "Download" or "View PDF".
---

## STEP 6: CSS Selectors (CRITICAL)

Based on the HTML you pasted above, identify these selectors:

### Selector for Job Rows
**CSS selector that matches each job listing:**
```css
table#myTable tbody tr
OR (using semantic HTML5 elements):

css
[id="myTable"] > cell
OR (most compatible for modern selectors):

css
#myTable tr

```

### Selector for Job Title (within a row)
**CSS selector to get the title from within a job row:**
```css
CSS selector to get the title from within a job row:

css
tr > td > a:first-of-type
OR (more specific):

css
#myTable tr td a[href="/Advertisement.html"]:first-of-type
OR (simplest):

css
a[href="/Advertisement.html"]
```

### Selector for PDF Link (within a row)
**CSS selector to get the PDF link from within a job row:**
```css
CSS selector to get the PDF link from within a job row:

css
a[href$=".pdf"]
OR (more specific for advertisement PDF):

css
a[href*="/Advertisements/"][href$=".pdf"]
OR (for all PDF links in a specific row):

css
tr > td a[href$=".pdf"]
```

### Selector for Date (within a row)
**CSS selector to get the date from within a job row:**
```css
CSS selector to get the date from within a job row:
css
td > generic:contains("Issued Date")
OR (more practical):
css
td generic
OR (using text content matching):
css
div:has(> :contains("Issued Date"))
```

---

## STEP 7: Verification Checklist

Before submitting, verify:

- [✓] I can access spsc.sikkim.gov.in
- [✓] I found the notifications/advertisements page
- [✓] I copied the exact URL of that page
- [✓] I pasted actual HTML from the page (not example HTML)
- [✓] I identified the correct CSS selectors
- [✓] I copied 3 real PDF URLs
- [✓] I noted the actual date format used

---

## STEP 8: Additional Observations

### Any Issues Found?
- [✘] Website requires login
- [✘] Website uses JavaScript to load jobs
- [✘] PDFs are behind CAPTCHA

### Notes
no notes
---

## Submit This Form

Once completed, provide this information so the scraper can be updated with verified selectors.
