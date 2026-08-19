# LetterMaker

LetterMaker creates print-ready letters with folding guides using LaTeX's [scrlttr2](https://ctan.org/pkg/scrlttr2) document class.

## Why it exists

While I was at university, I occasionally had to send *formlose Anträge* (informal written requests) to authorities such as the BAföG office. I made a LaTeX template for them and wanted my family and friends to be able to use it too. Installing TeX Live just to write a letter seemed a bit much, so I put the template behind a web form.

You fill in the letter in your browser and get LaTeX typesetting without needing to know LaTeX or install it.

## Why React and Go?

I also used LetterMaker to learn React and Go. The [frontend](/frontend/) is my first React application. It is client-rendered and uses [Vite](https://vite.dev/) and [shadcn/ui](https://ui.shadcn.com/). The [backend](/backend/) is my first Go service. It uses [Gin](https://gin-gonic.com/) to turn the submitted form data into a PDF.

Keeping the frontend and backend separate is overkill for a project this size. A single codebase would be simpler. I kept the split because I wanted to learn how to design an HTTP API and work on both sides of it.

> [!NOTE]
> LetterMaker follows German postal conventions: it uses A4 pages and supports digital stamps from [Deutsche Post](https://www.deutschepost.de/de.html).

## Preview

![site preview](/screenshots/site.png)

![letter preview](/screenshots/letter.png)

## Instructions for using stamps

When buying a Deutsche Post stamp, include the recipient and/or sender information so that it appears on the stamp.

Also select "Einlegeblatt" during checkout.

![stamp purchase instructions](/screenshots/stamp.png)
