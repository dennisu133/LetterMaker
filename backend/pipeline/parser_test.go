package pipeline

import (
	"strings"
	"testing"
)

func TestEscapeLatex(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"plain text", "Hello World", "Hello World"},
		{"backslash", `\`, `\textbackslash{}`},
		{"braces", `{}`, `\{\}`},
		{"dollar", `$5`, `\$5`},
		{"ampersand", `a & b`, `a \& b`},
		{"percent", `100%`, `100\%`},
		{"hash", `#1`, `\#1`},
		{"underscore", `a_b`, `a\_b`},
		{"caret", `a^b`, `a\textasciicircum{}b`},
		{"tilde", `~`, `\textasciitilde{}`},
		{"backslash before brace is not double-escaped", `\{`, `\textbackslash{}\{`},
		{"write18 injection", `\write18{rm -rf /}`, `\textbackslash{}write18\{rm -rf /\}`},
		{"input injection", `\input{/etc/passwd}`, `\textbackslash{}input\{/etc/passwd\}`},
		{"unicode passes through", "Grüße, 你好", "Grüße, 你好"},
		{"empty string", "", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EscapeLatex(tt.input); got != tt.want {
				t.Errorf("EscapeLatex(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestEscapeLatexMultiline(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{"unix newline", "line1\nline2", `line1\\line2`},
		{"windows newline", "line1\r\nline2", `line1\\line2`},
		{"escapes specials too", "a & b\nc", `a \& b\\c`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := EscapeLatexMultiline(tt.input); got != tt.want {
				t.Errorf("EscapeLatexMultiline(%q) = %q, want %q", tt.input, got, tt.want)
			}
		})
	}
}

func TestParseProseMirrorToLatex(t *testing.T) {
	tests := []struct {
		name  string
		input string
		want  string
	}{
		{
			"single paragraph",
			`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Hello"}]}]}`,
			"Hello",
		},
		{
			"two paragraphs get a blank line",
			`{"type":"doc","content":[
				{"type":"paragraph","content":[{"type":"text","text":"One"}]},
				{"type":"paragraph","content":[{"type":"text","text":"Two"}]}]}`,
			"One\n\nTwo",
		},
		{
			"bold mark",
			`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"b","marks":[{"type":"bold"}]}]}]}`,
			`\textbf{b}`,
		},
		{
			"italic mark",
			`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"i","marks":[{"type":"italic"}]}]}]}`,
			`\textit{i}`,
		},
		{
			"underline mark",
			`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"u","marks":[{"type":"underline"}]}]}]}`,
			`\underline{u}`,
		},
		{
			"strike mark",
			`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"s","marks":[{"type":"strike"}]}]}]}`,
			`\sout{s}`,
		},
		{
			"stacked marks nest inner-first",
			`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"bold"},{"type":"italic"}]}]}]}`,
			`\textit{\textbf{x}}`,
		},
		{
			"unknown mark is ignored",
			`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"x","marks":[{"type":"glitter"}]}]}]}`,
			"x",
		},
		{
			"text is escaped",
			`{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"100% \\write18"}]}]}`,
			`100\% \textbackslash{}write18`,
		},
		{
			"bullet list",
			`{"type":"doc","content":[{"type":"bulletList","content":[
				{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"One"}]}]},
				{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Two"}]}]}]}]}`,
			"\\begin{itemize}\n\\item One\n\\item Two\n\\end{itemize}",
		},
		{
			"ordered list",
			`{"type":"doc","content":[{"type":"orderedList","content":[
				{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"First"}]}]}]}]}`,
			"\\begin{enumerate}\n\\item First\n\\end{enumerate}",
		},
		{
			"heading level 1",
			`{"type":"doc","content":[{"type":"heading","attrs":{"level":1},"content":[{"type":"text","text":"Title"}]}]}`,
			`\section*{Title}`,
		},
		{
			"heading level 2",
			`{"type":"doc","content":[{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Title"}]}]}`,
			`\subsection*{Title}`,
		},
		{
			"heading level 3 and beyond",
			`{"type":"doc","content":[{"type":"heading","attrs":{"level":5},"content":[{"type":"text","text":"Title"}]}]}`,
			`\subsubsection*{Title}`,
		},
		{
			"heading without attrs defaults to level 1",
			`{"type":"doc","content":[{"type":"heading","content":[{"type":"text","text":"Title"}]}]}`,
			`\section*{Title}`,
		},
		{
			"blockquote",
			`{"type":"doc","content":[{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"Quoted"}]}]}]}`,
			"\\begin{quote}\nQuoted\n\\end{quote}",
		},
		{
			"hard break",
			`{"type":"doc","content":[{"type":"paragraph","content":[
				{"type":"text","text":"a"},{"type":"hardBreak"},{"type":"text","text":"b"}]}]}`,
			`a\\b`,
		},
		{
			"unknown node renders its children",
			`{"type":"doc","content":[{"type":"mysteryBlock","content":[{"type":"text","text":"inner"}]}]}`,
			"inner",
		},
		{
			"empty document",
			`{"type":"doc","content":[]}`,
			"",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := ParseProseMirrorToLatex(tt.input)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got != tt.want {
				t.Errorf("got %q, want %q", got, tt.want)
			}
		})
	}
}

func TestParseProseMirrorToLatexErrors(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		wantErr string
	}{
		{"empty string", "", "empty content"},
		{"whitespace only", "   ", "empty content"},
		{"invalid JSON", "{not json", "invalid ProseMirror JSON"},
		{"top-level array", `[{"type":"doc"}]`, "invalid ProseMirror JSON"},
		{"wrong root type", `{"type":"paragraph"}`, "expected document type 'doc'"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := ParseProseMirrorToLatex(tt.input)
			if err == nil {
				t.Fatal("expected error, got nil")
			}
			if !strings.Contains(err.Error(), tt.wantErr) {
				t.Errorf("error %q does not contain %q", err.Error(), tt.wantErr)
			}
		})
	}
}
