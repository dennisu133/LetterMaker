package pipeline

import (
	"encoding/json"
	"fmt"
	"strings"
)

// -----------------------------------------------------------------------------
// LaTeX Text Escaping
// -----------------------------------------------------------------------------
//
// LaTeX has several special characters that must be escaped to prevent
// compilation errors or injection attacks. We use a whitelist approach:
// only explicitly handled characters pass through, everything else is
// escaped or preserved safely.

// latexReplacer handles the standard LaTeX special characters.
// Order matters: backslash must be replaced first!
var latexReplacer = strings.NewReplacer(
	`\`, `\textbackslash{}`,
	`{`, `\{`,
	`}`, `\}`,
	`$`, `\$`,
	`&`, `\&`,
	`%`, `\%`,
	`#`, `\#`,
	`_`, `\_`,
	`^`, `\textasciicircum{}`,
	`~`, `\textasciitilde{}`,
)

// EscapeLatex escapes special LaTeX characters in plain text.
// Use this for single-line fields like subject, salutation, names.
func EscapeLatex(s string) string {
	return latexReplacer.Replace(s)
}

// EscapeLatexMultiline escapes special LaTeX characters and converts
// newlines to LaTeX line breaks (\\).
// Use this for multi-line fields like addresses and signatures.
func EscapeLatexMultiline(s string) string {
	escaped := EscapeLatex(s)
	// Replace newlines with LaTeX line breaks
	// Handle both \r\n (Windows) and \n (Unix)
	escaped = strings.ReplaceAll(escaped, "\r\n", `\\`)
	escaped = strings.ReplaceAll(escaped, "\n", `\\`)
	return escaped
}

// -----------------------------------------------------------------------------
// ProseMirror JSON Types
// -----------------------------------------------------------------------------
//
// These types represent the ProseMirror document structure.
// We only define what we need for our whitelist-based conversion.
// Unknown node types will be handled gracefully (ignored or rendered as text).

// PMDoc represents a ProseMirror document.
type PMDoc struct {
	Type    string   `json:"type"`
	Content []PMNode `json:"content"`
}

// PMNode represents a node in the ProseMirror document tree.
type PMNode struct {
	Type    string   `json:"type"`
	Content []PMNode `json:"content,omitempty"`
	Text    string   `json:"text,omitempty"`
	Marks   []PMMark `json:"marks,omitempty"`
	Attrs   PMAttrs  `json:"attrs,omitempty"`
}

// PMMark represents a text mark (bold, italic, underline, etc.).
type PMMark struct {
	Type  string         `json:"type"`
	Attrs map[string]any `json:"attrs,omitempty"`
}

// PMAttrs holds optional node attributes.
type PMAttrs map[string]any

// -----------------------------------------------------------------------------
// ProseMirror to LaTeX Conversion
// -----------------------------------------------------------------------------
//
// Whitelist-based conversion: only explicitly supported node types are
// converted. Unknown types are either ignored or their text content is
// extracted safely.
//
// Supported nodes:
//   - doc: root container
//   - paragraph: \n\n between paragraphs
//   - heading: \section*, \subsection*, \subsubsection* (levels 1-3)
//   - text: escaped text with marks
//   - bulletList: itemize environment
//   - orderedList: enumerate environment
//   - listItem: \item
//   - blockquote: quote environment
//   - hardBreak: \\
//
// Supported marks:
//   - bold: \textbf{}
//   - italic: \textit{}
//   - underline: \underline{}
//   - strike: \sout{} (requires ulem package)

// ParseProseMirrorToLatex converts a ProseMirror JSON string to LaTeX.
// Returns an error if the JSON is invalid or doesn't represent a valid document.
func ParseProseMirrorToLatex(jsonStr string) (string, error) {
	if strings.TrimSpace(jsonStr) == "" {
		return "", fmt.Errorf("empty content")
	}

	var doc PMDoc
	if err := json.Unmarshal([]byte(jsonStr), &doc); err != nil {
		return "", fmt.Errorf("invalid ProseMirror JSON: %v", err)
	}

	if doc.Type != "doc" {
		return "", fmt.Errorf("expected document type 'doc', got '%s'", doc.Type)
	}

	var sb strings.Builder
	if err := renderNodes(&sb, doc.Content, false); err != nil {
		return "", err
	}

	return strings.TrimSpace(sb.String()), nil
}

// renderNodes renders a slice of nodes to the string builder.
// inList indicates whether we're inside a list (affects paragraph handling).
func renderNodes(sb *strings.Builder, nodes []PMNode, inList bool) error {
	for i, node := range nodes {
		if err := renderNode(sb, node, inList); err != nil {
			return err
		}

		// Add paragraph separation (but not after the last node)
		if node.Type == "paragraph" && !inList && i < len(nodes)-1 {
			// Check if next node is also a paragraph (needs blank line)
			if nodes[i+1].Type == "paragraph" {
				sb.WriteString("\n\n")
			} else {
				sb.WriteString("\n")
			}
		}
	}
	return nil
}

// renderNode renders a single node to the string builder.
func renderNode(sb *strings.Builder, node PMNode, inList bool) error {
	switch node.Type {
	case "paragraph":
		return renderParagraph(sb, node)

	case "text":
		return renderText(sb, node)

	case "bulletList":
		return renderBulletList(sb, node)

	case "orderedList":
		return renderOrderedList(sb, node)

	case "listItem":
		return renderListItem(sb, node)

	case "heading":
		return renderHeading(sb, node)

	case "blockquote":
		return renderBlockquote(sb, node)

	case "hardBreak":
		sb.WriteString(`\\`)
		return nil

	default:
		// Unknown node type: try to extract text content safely
		// This is a fallback for forward compatibility
		return renderNodes(sb, node.Content, inList)
	}
}

func renderParagraph(sb *strings.Builder, node PMNode) error {
	for _, child := range node.Content {
		if err := renderNode(sb, child, false); err != nil {
			return err
		}
	}
	return nil
}

func renderText(sb *strings.Builder, node PMNode) error {
	text := EscapeLatex(node.Text)

	// Apply marks in order (wrap with LaTeX commands)
	for _, mark := range node.Marks {
		switch mark.Type {
		case "bold":
			text = `\textbf{` + text + `}`
		case "italic":
			text = `\textit{` + text + `}`
		case "underline":
			text = `\underline{` + text + `}`
		case "strike":
			text = `\sout{` + text + `}`
			// Unknown marks are ignored (text still appears, just unstyled)
		}
	}

	sb.WriteString(text)
	return nil
}

func renderBulletList(sb *strings.Builder, node PMNode) error {
	sb.WriteString("\n\\begin{itemize}\n")
	for _, item := range node.Content {
		if err := renderNode(sb, item, true); err != nil {
			return err
		}
	}
	sb.WriteString("\\end{itemize}\n")
	return nil
}

func renderOrderedList(sb *strings.Builder, node PMNode) error {
	sb.WriteString("\n\\begin{enumerate}\n")
	for _, item := range node.Content {
		if err := renderNode(sb, item, true); err != nil {
			return err
		}
	}
	sb.WriteString("\\end{enumerate}\n")
	return nil
}

func renderListItem(sb *strings.Builder, node PMNode) error {
	sb.WriteString("\\item ")
	// List items contain paragraphs, render their content inline
	for _, child := range node.Content {
		if child.Type == "paragraph" {
			for _, pChild := range child.Content {
				if err := renderNode(sb, pChild, true); err != nil {
					return err
				}
			}
		} else {
			if err := renderNode(sb, child, true); err != nil {
				return err
			}
		}
	}
	sb.WriteString("\n")
	return nil
}

func renderHeading(sb *strings.Builder, node PMNode) error {
	// Add newline before heading for proper spacing
	sb.WriteString("\n")

	// Extract heading level from attrs (default to 1)
	level := 1
	if node.Attrs != nil {
		if l, ok := node.Attrs["level"]; ok {
			switch v := l.(type) {
			case float64:
				level = int(v)
			case int:
				level = v
			}
		}
	}

	// Map level to LaTeX command (using starred versions to avoid numbering)
	var cmd string
	switch level {
	case 1:
		cmd = `\section*`
	case 2:
		cmd = `\subsection*`
	default:
		cmd = `\subsubsection*`
	}

	sb.WriteString(cmd)
	sb.WriteString("{")

	// Render heading content
	for _, child := range node.Content {
		if err := renderNode(sb, child, false); err != nil {
			return err
		}
	}

	sb.WriteString("}\n")
	return nil
}

func renderBlockquote(sb *strings.Builder, node PMNode) error {
	sb.WriteString("\n\\begin{quote}\n")
	for _, child := range node.Content {
		if err := renderNode(sb, child, false); err != nil {
			return err
		}
	}
	sb.WriteString("\n\\end{quote}")
	return nil
}
