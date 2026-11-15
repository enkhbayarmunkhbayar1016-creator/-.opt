export const requireAuthenticatedUser = (authStore) => (req, res, next) => {
  const authorization = req.get("authorization") ?? ""
  const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1]
  if (!token || !authStore?.findUserBySessionToken) {
    return res.status(401).json({ message: "Нэвтэрч үргэлжлүүлнэ үү." })
  }

  Promise.resolve(authStore.findUserBySessionToken(token))
    .then((user) => {
      if (!user) {
        return res
          .status(401)
          .json({ message: "Нэвтрэх хугацаа дууссан байна." })
      }
      req.authenticatedUser = user
      return next()
    })
    .catch(next)
}
