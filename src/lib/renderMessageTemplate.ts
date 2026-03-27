interface TemplateVariables {
  customer_name?: string;
  order_id?: string;
  order_total?: string;
  order_date?: string;
  delivery_address?: string;
  phone_number?: string;
}

export function renderTemplate(
  template: string,
  variables: TemplateVariables
): string {
  let result = template;

  Object.entries(variables).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), value || '');
  });

  return result;
}

export function extractVariables(
  template: string
): string[] {
  const matches = template.match(/{(\w+)}/g) || [];
  return matches.map(m => m.slice(1, -1)); // Remove { }
}
