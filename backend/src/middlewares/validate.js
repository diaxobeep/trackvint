/**
 * Validation légère (sans express-validator — import trop lent en local).
 */

/**
 * @param {Record<string, unknown>} fields
 * @returns {(req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => void}
 */
export function requireFields(fields) {
  return (req, res, next) => {
    /** @type {{ field: string, message: string }[]} */
    const details = [];
    for (const [name, rule] of Object.entries(fields)) {
      const source =
        rule === 'param' ? req.params : rule === 'query' ? req.query : req.body;
      const value = source?.[name];
      if (value == null || value === '') {
        details.push({ field: name, message: `${name} requis` });
      }
    }
    if (details.length) {
      return res.status(400).json({ error: 'validation_error', details });
    }
    return next();
  };
}

/** Compat — plus de chaîne express-validator. */
export function validateRequest(_req, _res, next) {
  return next();
}
