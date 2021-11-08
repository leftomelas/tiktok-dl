import type {VercelRequest, VercelResponse} from '@vercel/node';
import ow from 'ow';
import {getProvider, Providers} from '../lib/providers';
import {BaseProvider} from '../lib/providers/baseProvider';
import {rotateProvider} from '../lib/rotator';
import {ratelimitMiddleware} from '../middleware/ratelimit';

const providersType = Providers.map((p) => p.resourceName());

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    ow(req.query, ow.object.exactShape({
      'url': ow.string.url,
      'type': ow.optional.string.validate((v) => ({
        'validator': typeof v === 'string' &&
         providersType.includes(v.toLowerCase()),
        'message': 'Invalid Provider, available provider is: ' +
          Providers.map((x) => x.resourceName()).join(', '),
      })),
    }));

    const provider = getProvider(req.query.type ?? 'random');
    if (!provider) {
      return res.status(400).json({
        'error': 'Invalid provider',
        'providers': providersType,
      });
    }
    const result = await rotateProvider(
      provider as BaseProvider, req.query.url);
    await ratelimitMiddleware(req);
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({
      'error': (e as Error).message,
    });
  }
};
