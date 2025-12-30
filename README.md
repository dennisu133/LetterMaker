# LetterMaker

A utility to create beautiful letters with folding guides using the [LaTeX](https://en.wikipedia.org/wiki/LaTeX) package [scrlttr2](https://ctan.org/pkg/scrlttr2).

> [!NOTE]
> This is primarily developed to be used in **Germany**. It explicitly only accepts digital stamps from Germany's [Deutsche Post](https://www.deutschepost.de/de.html) and uses A4 letter format.

The [frontend](/frontend/) is written using [React](https://github.com/facebook/react), using the [Shadcn component library](https://github.com/shadcn-ui/ui).  
The [backend](/backend/) is written in Go, primarily using [Gin](https://github.com/gin-gonic/gin).

## Preview

![site preview](/screenshots/site.png)

![letter preview](/screenshots/letter.png)

## Instructions for using stamps

When using Deutsche Post stamps. Please make sure to fill out recipient and/or sender information so it's on the stamp.

Additionally make sure to select "Einlegeblatt" on purchase.

![stamp purchase instructions](/screenshots/stamp.png)
