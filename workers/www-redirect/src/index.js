export default {
  fetch(request) {
    const destination = new URL(request.url);
    destination.protocol = "https:";
    destination.hostname = "soyaos.ai";

    return Response.redirect(destination.toString(), 301);
  },
};
