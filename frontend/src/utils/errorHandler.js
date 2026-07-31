export const ErrorTypes = {
  NETWORK: 'NETWORK_ERROR',
  API: 'API_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  AUTH: 'AUTH_ERROR',
  NOT_FOUND: 'NOT_FOUND_ERROR',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

const DEFAULT_MESSAGES = {
  [ErrorTypes.NETWORK]: 'Erreur de connexion au serveur. Vérifiez votre réseau.',
  [ErrorTypes.API]: 'Erreur lors de la communication avec le serveur.',
  [ErrorTypes.VALIDATION]: 'Données invalides. Veuillez vérifier vos saisies.',
  [ErrorTypes.AUTH]: 'Erreur d\'authentification. Vérifiez votre clé API.',
  [ErrorTypes.NOT_FOUND]: 'Ressource non trouvée.',
  [ErrorTypes.SERVER]: 'Erreur interne du serveur. Veuillez réessayer plus tard.',
  [ErrorTypes.UNKNOWN]: 'Une erreur inattendue s\'est produite.',
};

export const parseApiError = (error) => {
  if (error.response) {
    const status = error.response.status;
    const data = error.response.data || {};
    
    let type = ErrorTypes.API;
    if (status === 401 || status === 403) type = ErrorTypes.AUTH;
    else if (status === 404) type = ErrorTypes.NOT_FOUND;
    else if (status >= 500) type = ErrorTypes.SERVER;
    else if (status === 400) type = ErrorTypes.VALIDATION;
    
    return {
      type,
      message: data.error || data.message || DEFAULT_MESSAGES[type],
      details: data.details || data.errors || null,
      status,
    };
  }
  
  if (error.request) {
    return {
      type: ErrorTypes.NETWORK,
      message: DEFAULT_MESSAGES[ErrorTypes.NETWORK],
      details: 'Le serveur ne répond pas. Vérifiez votre connexion.',
      status: null,
    };
  }
  
  return {
    type: ErrorTypes.UNKNOWN,
    message: error.message || DEFAULT_MESSAGES[ErrorTypes.UNKNOWN],
    details: null,
    status: null,
  };
};

export const formatErrorForUser = (error) => {
  const parsed = typeof error === 'string' ? { message: error } : error;
  const errorData = parsed.type ? parsed : parseApiError(parsed);
  
  let userMessage = errorData.message;
  
  if (errorData.type === ErrorTypes.NETWORK) {
    userMessage += ' Vérifiez votre connexion internet.';
  } else if (errorData.type === ErrorTypes.AUTH) {
    userMessage += ' Vérifiez votre clé API FIRMS.';
  } else if (errorData.type === ErrorTypes.SERVER) {
    userMessage += ' L\'équipe technique a été notifiée.';
  }
  
  return {
    message: userMessage,
    type: errorData.type,
    details: errorData.details,
    severity: getErrorSeverity(errorData.type),
  };
};

export const getErrorSeverity = (type) => {
  const severities = {
    [ErrorTypes.NETWORK]: 'medium',
    [ErrorTypes.API]: 'medium',
    [ErrorTypes.VALIDATION]: 'low',
    [ErrorTypes.AUTH]: 'high',
    [ErrorTypes.NOT_FOUND]: 'low',
    [ErrorTypes.SERVER]: 'high',
    [ErrorTypes.UNKNOWN]: 'high',
  };
  return severities[type] || 'medium';
};

export const handleError = (error, context = {}) => {
  const parsed = parseApiError(error);
  console.error('❌ Erreur:', {
    type: parsed.type,
    message: parsed.message,
    details: parsed.details,
    context,
  });
  return parsed;
};
