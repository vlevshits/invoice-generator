export interface InvoiceTemplate {
  id: string
  name: string
  description: string
  badge: string
  accentColor: string
  typstMarkup: string
}

export const INVOICE_TEMPLATES: InvoiceTemplate[] = [
  {
    id: 'standard',
    name: 'Standard Professional',
    description: 'Clean, balanced corporate layout with slate gray typography and structured grid borders.',
    badge: 'Default',
    accentColor: '#10b981',
    typstMarkup: `#set page(paper: "a4", margin: (x: 1.5cm, y: 1.8cm))
#set text(size: 9.5pt)

#grid(
  columns: (1.35fr, 0.65fr),
  align: (left, right),
  [
    #text(size: 14pt, weight: "bold", fill: rgb("0f172a"))[{{seller_name}}] \\
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("475569"))[
      Tax ID: {{seller_tax_id}} \\
      {{seller_address}}
    ]
  ],
  [
    #text(size: 22pt, weight: "bold", fill: rgb("10b981"))[INVOICE] \\
    #v(2pt)
    #text(size: 10.5pt, weight: "bold")[Invoice No. {{invoice_number}}] \\
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("475569"))[
      Issue Date: {{issue_date}} \\
      {{due_date}}
    ]
  ]
)

#v(12pt)
#line(length: 100%, stroke: 0.5pt + rgb("e2e8f0"))
#v(8pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 20pt,
  [
    #text(weight: "bold", fill: rgb("64748b"), size: 8pt)[INVOICE TO:] \\
    #v(2pt)
    #text(weight: "bold", size: 10.5pt)[{{buyer_name}}] \\
    #text(size: 8.5pt, fill: rgb("334155"))[
      Tax ID: {{buyer_tax_id}} \\
      {{buyer_director}}
      Address: {{buyer_address}}
    ]
  ],
  [
    #text(weight: "bold", fill: rgb("64748b"), size: 8pt)[PAYMENT DETAILS:] \\
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("334155"))[
      Bank: {{bank_name}} \\
      Beneficiary: {{bank_beneficiary}} \\
      IBAN: #raw("{{bank_iban}}") \\
      SWIFT/BIC: #raw("{{bank_swift}}") \\
      {{intermediary_info}}
    ]
  ]
)

#v(16pt)

#table(
  columns: (1fr, 85pt, 85pt, 95pt),
  align: (left, center, right, right),
  fill: (x, y) => if y == 0 { rgb("f8fafc") } else if calc.even(y) { rgb("f8fafc") } else { none },
  stroke: 0.5pt + rgb("e2e8f0"),
  [ *Description* ], [ *Qty (Units)* ], [ *Unit Price* ], [ *Net Price* ],
{{items_table_rows}})

#v(12pt)

#align(right)[
  #block(width: 320pt)[
    #grid(
      columns: (1fr, auto),
      align: (left, right),
      row-gutter: 6pt,
      [ *Grand Total:* ], [ *#text(size: 13pt, weight: "bold", fill: rgb("10b981"))[{{currency_symbol}}{{total_amount}}]* ]
    )
    #v(4pt)
    #line(length: 100%, stroke: 0.5pt + rgb("e2e8f0"))
    #v(4pt)
    #align(left)[
      #text(size: 8.5pt, fill: rgb("334155"))[
        *Amount in words:* {{amount_in_words}}
      ]
    ]
  ]
]

{{notes}}

#v(40pt)

#grid(
  columns: (1fr, 1fr),
  align: (center, center),
  gutter: 40pt,
  [
    #line(length: 80%, stroke: 0.5pt + rgb("94a3b8"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("64748b"))[Authorized Signature / Issuer]
  ],
  [
    #line(length: 80%, stroke: 0.5pt + rgb("94a3b8"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("64748b"))[Client Acceptance / Stamp]
  ]
)
`,
  },
  {
    id: 'modern_emerald',
    name: 'Modern Emerald',
    description: 'Vibrant emerald styling with soft tinted table headers, prominent header banner, and modern status pill.',
    badge: 'Popular',
    accentColor: '#059669',
    typstMarkup: `#set page(paper: "a4", margin: (x: 1.5cm, y: 1.8cm))
#set text(size: 9.5pt)

#rect(
  width: 100%,
  fill: rgb("047857"),
  radius: 6pt,
  inset: (x: 16pt, y: 14pt)
)[
  #grid(
    columns: (1.3fr, 0.7fr),
    align: (left, right),
    [
      #text(size: 16pt, weight: "bold", fill: rgb("ffffff"))[{{seller_name}}] \\
      #v(2pt)
      #text(size: 8.5pt, fill: rgb("a7f3d0"))[
        Tax ID: {{seller_tax_id}} | {{seller_address}}
      ]
    ],
    [
      #text(size: 20pt, weight: "bold", fill: rgb("ffffff"))[INVOICE] \\
      #text(size: 9.5pt, weight: "medium", fill: rgb("ecfdf5"))[No. {{invoice_number}}]
    ]
  )
]

#v(10pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 15pt,
  [
    #rect(width: 100%, fill: rgb("f0fdf4"), radius: 4pt, inset: 10pt)[
      #text(weight: "bold", fill: rgb("047857"), size: 8pt)[BILLED TO] \\
      #v(2pt)
      #text(weight: "bold", size: 10pt)[{{buyer_name}}] \\
      #text(size: 8.5pt, fill: rgb("334155"))[
        Tax ID: {{buyer_tax_id}} \\
        {{buyer_director}}
        Address: {{buyer_address}}
      ]
    ]
  ],
  [
    #rect(width: 100%, fill: rgb("f8fafc"), radius: 4pt, inset: 10pt)[
      #grid(
        columns: (1fr, 1fr),
        row-gutter: 4pt,
        [ *Issue Date:* ], [ {{issue_date}} ],
        [ *Due Date:* ], [ {{due_date}} ],
        [ *Bank:* ], [ {{bank_name}} ],
        [ *IBAN:* ], [ #raw("{{bank_iban}}") ]
      )
    ]
  ]
)

#v(12pt)

#table(
  columns: (1fr, 85pt, 85pt, 95pt),
  align: (left, center, right, right),
  fill: (x, y) => if y == 0 { rgb("d1fae5") } else if calc.even(y) { rgb("f0fdf4") } else { none },
  stroke: 0.5pt + rgb("a7f3d0"),
  [ *#text(fill: rgb("065f46"))[Description]* ], [ *#text(fill: rgb("065f46"))[Qty]* ], [ *#text(fill: rgb("065f46"))[Unit Price]* ], [ *#text(fill: rgb("065f46"))[Net Price]* ],
{{items_table_rows}})

#v(12pt)

#align(right)[
  #block(width: 320pt)[
    #grid(
      columns: (1fr, auto),
      align: (left, right),
      row-gutter: 6pt,
      [ *Total Payable:* ], [ *#text(size: 14pt, weight: "bold", fill: rgb("047857"))[{{currency_symbol}}{{total_amount}}]* ]
    )
    #v(4pt)
    #line(length: 100%, stroke: 0.5pt + rgb("a7f3d0"))
    #v(4pt)
    #align(left)[
      #text(size: 8.5pt, fill: rgb("065f46"))[
        *Amount in words:* {{amount_in_words}}
      ]
    ]
  ]
]

{{notes}}

#v(35pt)
#grid(
  columns: (1fr, 1fr),
  align: (center, center),
  gutter: 40pt,
  [
    #line(length: 80%, stroke: 0.5pt + rgb("059669"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("047857"))[Authorized Signature]
  ],
  [
    #line(length: 80%, stroke: 0.5pt + rgb("059669"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("047857"))[Client Stamp]
  ]
)
`,
  },
  {
    id: 'executive_indigo',
    name: 'Executive Indigo',
    description: 'Dark indigo header banner, formal corporate styling, double-line rules, and high contrast detail sections.',
    badge: 'Executive',
    accentColor: '#3730a3',
    typstMarkup: `#set page(paper: "a4", margin: (x: 1.5cm, y: 1.8cm))
#set text(size: 9.5pt)

#grid(
  columns: (1.4fr, 0.6fr),
  align: (left, right),
  [
    #text(size: 15pt, weight: "bold", fill: rgb("1e1b4b"))[{{seller_name}}] \\
    #v(2pt)
    #text(size: 8.5pt, fill: rgb("4338ca"))[
      Tax ID: {{seller_tax_id}} \\
      {{seller_address}}
    ]
  ],
  [
    #block(
      fill: rgb("1e1b4b"),
      inset: (x: 12pt, y: 8pt),
      radius: 4pt
    )[
      #text(size: 16pt, weight: "bold", fill: rgb("ffffff"))[INVOICE] \\
      #text(size: 9pt, fill: rgb("c7d2fe"))[#raw("{{invoice_number}}")]
    ]
  ]
)

#v(10pt)
#line(length: 100%, stroke: 1.5pt + rgb("312e81"))
#v(10pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 20pt,
  [
    #text(weight: "bold", fill: rgb("312e81"), size: 8.5pt)[CLIENT DETAILS] \\
    #v(3pt)
    #text(weight: "bold", size: 10pt)[{{buyer_name}}] \\
    #text(size: 8.5pt, fill: rgb("334155"))[
      Tax ID: {{buyer_tax_id}} \\
      {{buyer_director}}
      Address: {{buyer_address}}
    ]
  ],
  [
    #text(weight: "bold", fill: rgb("312e81"), size: 8.5pt)[REMITTANCE INSTRUCTIONS] \\
    #v(3pt)
    #text(size: 8.5pt, fill: rgb("334155"))[
      Bank: {{bank_name}} \\
      Beneficiary: {{bank_beneficiary}} \\
      IBAN: #raw("{{bank_iban}}") \\
      SWIFT/BIC: #raw("{{bank_swift}}") \\
      {{intermediary_info}}
    ]
  ]
)

#v(14pt)

#table(
  columns: (1fr, 85pt, 85pt, 95pt),
  align: (left, center, right, right),
  fill: (x, y) => if y == 0 { rgb("e0e7ff") } else { none },
  stroke: 0.5pt + rgb("c7d2fe"),
  [ *#text(fill: rgb("1e1b4b"))[Service Description]* ], [ *#text(fill: rgb("1e1b4b"))[Quantity]* ], [ *#text(fill: rgb("1e1b4b"))[Rate]* ], [ *#text(fill: rgb("1e1b4b"))[Amount]* ],
{{items_table_rows}})

#v(12pt)

#align(right)[
  #block(width: 320pt)[
    #grid(
      columns: (1fr, auto),
      align: (left, right),
      row-gutter: 6pt,
      [ *Grand Total:* ], [ *#text(size: 14pt, weight: "bold", fill: rgb("1e1b4b"))[{{currency_symbol}}{{total_amount}}]* ]
    )
    #v(4pt)
    #line(length: 100%, stroke: 1pt + rgb("312e81"))
    #v(4pt)
    #align(left)[
      #text(size: 8.5pt, fill: rgb("312e81"))[
        *Amount in words:* {{amount_in_words}}
      ]
    ]
  ]
]

{{notes}}

#v(40pt)
#grid(
  columns: (1fr, 1fr),
  align: (center, center),
  gutter: 40pt,
  [
    #line(length: 80%, stroke: 0.5pt + rgb("312e81"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("312e81"))[Issuer Authorization]
  ],
  [
    #line(length: 80%, stroke: 0.5pt + rgb("312e81"))
    #v(3pt)
    #text(size: 8pt, fill: rgb("312e81"))[Recipient Signature]
  ]
)
`,
  },
  {
    id: 'compact_minimal',
    name: 'Compact Minimal',
    description: 'High-density, space-efficient minimalist layout designed for multi-item invoices.',
    badge: 'Compact',
    accentColor: '#475569',
    typstMarkup: `#set page(paper: "a4", margin: (x: 1.2cm, y: 1.2cm))
#set text(size: 9pt)

#grid(
  columns: (1.4fr, 0.6fr),
  align: (left, right),
  [
    #text(size: 13pt, weight: "bold")[{{seller_name}}] \\
    #text(size: 8pt, fill: rgb("475569"))[Tax ID: {{seller_tax_id}} | {{seller_address}}]
  ],
  [
    #text(size: 16pt, weight: "bold")[INVOICE] \\
    #text(size: 9pt)[No. #raw("{{invoice_number}}")] \\
    #text(size: 8pt, fill: rgb("475569"))[Date: {{issue_date}} | {{due_date}}]
  ]
)

#v(6pt)
#line(length: 100%, stroke: 0.5pt + rgb("cbd5e1"))
#v(6pt)

#grid(
  columns: (1fr, 1fr),
  gutter: 10pt,
  [
    #text(size: 8pt, weight: "bold", fill: rgb("475569"))[TO:] #text(weight: "bold")[{{buyer_name}}] (Tax ID: {{buyer_tax_id}}) \\
    #text(size: 8pt, fill: rgb("475569"))[{{buyer_director}} {{buyer_address}}]
  ],
  [
    #text(size: 8pt, weight: "bold", fill: rgb("475569"))[BANK:] {{bank_name}} | IBAN: #raw("{{bank_iban}}") | SWIFT: #raw("{{bank_swift}}") \\
    #text(size: 8pt, fill: rgb("475569"))[{{intermediary_info}}]
  ]
)

#v(8pt)

#table(
  columns: (1fr, 70pt, 75pt, 85pt),
  align: (left, center, right, right),
  fill: (x, y) => if y == 0 { rgb("f1f5f9") } else { none },
  stroke: 0.3pt + rgb("cbd5e1"),
  [ *Description* ], [ *Qty* ], [ *Price* ], [ *Amount* ],
{{items_table_rows}})

#v(8pt)

#align(right)[
  #block(width: 280pt)[
    #grid(
      columns: (1fr, auto),
      align: (left, right),
      [ *Total:* ], [ *#text(size: 12pt, weight: "bold")[{{currency_symbol}}{{total_amount}}]* ]
    )
    #v(2pt)
    #text(size: 8pt, fill: rgb("475569"))[*In Words:* {{amount_in_words}}]
  ]
]

{{notes}}
`,
  },
]
