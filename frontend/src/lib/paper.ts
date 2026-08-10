/**
 * Shared class strings for the "ink on paper" letter sheet.
 *
 * The letter keeps its paper/ink colors in both themes (the sheet stays light
 * in dark mode), so controls placed on it cannot use the theme-dependent
 * muted/accent tokens — these overrides swap them for paper-relative colors.
 */

/** Turns a shadcn Input/Textarea into a bare ink line on the paper. */
export const inkInput =
	"h-auto min-h-0 rounded-none border-0 border-b border-dashed border-paper-line bg-transparent px-0 py-0.5 font-serif text-paper-foreground shadow-none transition-colors placeholder:text-paper-faint hover:border-paper-muted focus-visible:border-solid focus-visible:border-paper-foreground focus-visible:bg-paper-foreground/5 focus-visible:ring-0 aria-invalid:border-solid aria-invalid:border-destructive aria-invalid:ring-0 dark:bg-transparent dark:aria-invalid:border-destructive";

/**
 * Floating ink-dark surface, matching the tooltip design — for transient
 * chrome (e.g. error popovers) that must contrast with paper and desk in both
 * themes. Re-scopes the tokens used by text inside so they stay readable on
 * the dark surface.
 */
export const inkSurface =
	"bg-tooltip text-tooltip-foreground ring-white/10 shadow-[0_2px_6px_oklch(0_0_0/0.25),0_10px_28px_oklch(0_0_0/0.2)] [--destructive:oklch(0.72_0.19_22)] [--muted-foreground:oklch(0.75_0.015_80)]";

/** Quiet icon/toggle controls that sit directly on the paper. */
export const quietControl =
	"text-paper-muted hover:bg-paper-foreground/10 hover:text-paper-foreground dark:hover:bg-paper-foreground/10 aria-pressed:bg-paper-foreground/15 aria-pressed:text-paper-foreground data-[state=on]:bg-paper-foreground/15 data-[state=on]:text-paper-foreground aria-expanded:bg-paper-foreground/10 aria-expanded:text-paper-foreground";
