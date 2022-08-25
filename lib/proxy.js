function get_env_var(keys, try_lower) {
    var val, i = -1, env = process.env;
    while (!val && i < keys.length-1) {
      val = env[keys[++i]];
      if (!val && try_lower) {
        val = env[keys[i].toLowerCase()];
      }
    }
    return val;
}

// returns false if a no_proxy host matches given url
function should_proxy_to(uri) {
    const noProxy = get_env_var(["NO_PROXY"], true);
    if (!noProxy) {
        return true;
    }

    var urlMatchedNoProxyPattern = false;
    const requestUrl = new URL(uri);
    const patternList = noProxy.split(/[\s,]+/);

    // iterate over all NO_PROXY patterns and determine whether the given URL matches any of them
    for (const pattern of patternList) {
        if(pattern.trim().length == 0) {
          continue;
        }

        // replace leading dot by asterisk, escape dots and finally replace asterisk by .*
        const preparedPattern = pattern.replace(/^\./, "*").replace(/[.]/g, '\\$&').replace(/\*/g, '.*')
        const regex = new RegExp(preparedPattern)
        const isRegexExists = uri.match(regex);
        if (isRegexExists) {
          const matches = (isRegexExists.length > 0);
          if (matches) {
            // hostname + port of the request URL match a given NO_PROXY pattern
            urlMatchedNoProxyPattern = true;
            break;
            }
        }
    }

    return !urlMatchedNoProxyPattern;
}

module.exports.should_proxy_to = should_proxy_to;
module.exports.get_env_var = get_env_var;
